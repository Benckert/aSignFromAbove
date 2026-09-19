'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  MAX_BLOCKS,
  defaultSign,
  makeBlock,
  placeNewBlock,
  reviveSign,
  type Sign,
  type TextBlock,
} from './model';

/**
 * The sign, the history of it, and what has been measured about it.
 *
 * ── On the two kinds of change ────────────────────────────────────────────
 *
 * `commit` and `live` are the whole design of the undo here, and the reason it
 * is written rather than pulled in as a middleware. A drag is one action to a
 * person and several hundred state changes to a program. A generic history
 * records every one of them, so undoing a drag means pressing the key three
 * hundred times. A commit is a thing the customer did; a live change is the
 * tool keeping up with their hand.
 *
 * ── On measurements living here ───────────────────────────────────────────
 *
 * How big a block came out is not a setting, it is a fact reported by whatever
 * drew it. It is kept in the store because three separate parts of the designer
 * need the same answer — the board draws a frame round it, the size control
 * works out how large the letters may still be, and the fit rule keeps them
 * inside the wood — and only one of the three can see the element that was
 * measured.
 */

const LIMIT = 50;

/**
 * What the renderer reported about one block.
 *
 * The cap height travels with the box because it is what makes the box mean
 * anything: every dimension of set type is proportional to it, so one
 * measurement solves for the largest cap that still fits the board. Reading the
 * current cap out of the sign instead would pair a new size with last frame's
 * box for one render, and that one render is enough to snap the letters to a
 * size nobody chose.
 *
 * The offset is how far the box's centre fell from the point the text was
 * anchored at. Usually nothing — but a browser reports the union of the font's
 * box and the ink, and ink escapes the font box when a ring sits over an Å,
 * which is to say on most Swedish signs.
 */
export interface BlockBox {
  widthMm: number;
  heightMm: number;
  capMm: number;
  offsetXMm: number;
  offsetYMm: number;
}

interface SignStore {
  sign: Sign;
  past: Sign[];
  future: Sign[];

  /** Which block the controls are pointed at. Null when the board is. */
  selectedId: string | null;
  /** One entry per block that has been drawn and measured. */
  boxes: Record<string, BlockBox>;
  /**
   * The cap height last asked for, per block, which is not always the one in
   * force.
   *
   * A long word has to shrink to fit the board. Without this, shortening it
   * again leaves the letters small — the sign quietly keeps the size that a
   * word which is no longer there forced on it, and the only way back is to
   * find the size control and undo the tool's own decision. So the request is
   * remembered apart from the result, and the letters return to it as soon as
   * there is room. It can only ever let them grow, so a stale request cannot
   * overrule a smaller size the customer has since chosen.
   */
  wanted: Record<string, number>;

  /** A discrete change: typing, picking a face, releasing a drag. Undoable. */
  commit: (change: (sign: Sign) => Sign) => void;
  /** A continuous change during a gesture. Not recorded. */
  live: (change: (sign: Sign) => Sign) => void;
  /** Records the state a gesture is about to move away from. */
  mark: () => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;

  select: (id: string | null) => void;
  addBlock: () => void;
  removeBlock: (id: string) => void;
  /** Applies a patch to one block, leaving the rest of the sign alone. */
  patch: (id: string, patch: Partial<TextBlock>, discrete?: boolean) => void;

  measured: (id: string, box: BlockBox | null) => void;
  want: (id: string, capMm: number) => void;
}

/**
 * Storage that will not write until it has been read.
 *
 * Without this, persistence quietly did nothing at all, and the way it failed
 * is worth recording. The sign is rehydrated after mount rather than during a
 * render, because reading storage while rendering gives the browser different
 * markup from the one the server sent. But measuring a block happens in a
 * layout effect, and React runs every layout effect — including a deeply nested
 * child's — before any passive effect. So the order was: default sign loaded,
 * first block measured, measurement stored, `persist` dutifully wrote the
 * default sign over the customer's saved one, and only then did rehydration
 * run and faithfully restore what it had just been overwritten with.
 *
 * The read is the thing that cannot be moved earlier; the write is. Until
 * rehydration has asked for the saved sign, nothing may be written over it.
 */
let readYet = false;
let hadSaved = false;

function guardedStorage(): Storage {
  return {
    getItem: (name: string) => {
      const value = localStorage.getItem(name);
      // Latched on the first read, which is the only one that can answer the
      // question honestly. React runs effects twice in development, and by the
      // second rehydration the store has written its own state out — so asking
      // again would report the tool's own handiwork as the customer's.
      if (!readYet) {
        hadSaved = value !== null;
        readYet = true;
      }
      return value;
    },
    setItem: (name: string, value: string) => {
      if (readYet) localStorage.setItem(name, value);
    },
    removeItem: (name: string) => localStorage.removeItem(name),
  } as Storage;
}

/**
 * Whether rehydration found a sign waiting, rather than starting fresh.
 *
 * Asked after `rehydrate()` settles. Reading storage directly from the page
 * would race the same way the write did: by the time anything on the page can
 * ask, the store has written to it.
 */
export function wasRestored(): boolean {
  return hadSaved;
}

/** A copy of a record without one key. */
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

/** Replaces one block in a sign, by id. */
function withBlock(sign: Sign, id: string, change: (block: TextBlock) => TextBlock): Sign {
  const blocks = sign.blocks.map((block) => (block.id === id ? change(block) : block));
  return { ...sign, blocks };
}

export const useSign = create<SignStore>()(
  persist(
    (set, get) => ({
      sign: defaultSign(),
      past: [],
      future: [],
      selectedId: null,
      boxes: {},
      wanted: {},

      mark: () => set((state) => ({ past: [...state.past, state.sign].slice(-LIMIT), future: [] })),

      commit: (change) =>
        set((state) => {
          const sign = change(state.sign);
          if (sign === state.sign) return state;
          return { sign, past: [...state.past, state.sign].slice(-LIMIT), future: [] };
        }),

      live: (change) => set((state) => ({ sign: change(state.sign) })),

      undo: () => {
        const { past, sign, future } = get();
        const previous = past[past.length - 1];
        if (!previous) return;
        set({
          sign: previous,
          past: past.slice(0, -1),
          future: [sign, ...future].slice(0, LIMIT),
          selectedId: keepSelection(previous, get().selectedId),
        });
      },

      redo: () => {
        const { past, sign, future } = get();
        const [next, ...rest] = future;
        if (!next) return;
        set({
          sign: next,
          past: [...past, sign].slice(-LIMIT),
          future: rest,
          selectedId: keepSelection(next, get().selectedId),
        });
      },

      reset: () =>
        set({
          sign: defaultSign(),
          past: [],
          future: [],
          selectedId: null,
          boxes: {},
          wanted: {},
        }),

      select: (selectedId) => set({ selectedId }),

      addBlock: () =>
        set((state) => {
          if (state.sign.blocks.length >= MAX_BLOCKS) return state;
          const heights = Object.fromEntries(
            Object.entries(state.boxes).map(([id, box]) => [id, box.heightMm]),
          );
          const block = makeBlock(placeNewBlock(state.sign, heights));
          return {
            sign: { ...state.sign, blocks: [...state.sign.blocks, block] },
            past: [...state.past, state.sign].slice(-LIMIT),
            future: [],
            selectedId: block.id,
          };
        }),

      removeBlock: (id) =>
        set((state) => {
          // The last block stays. Removing it would leave a board with nothing
          // to type into and no way to get one back that is not a separate
          // control existing solely to undo this one.
          if (state.sign.blocks.length <= 1) return state;
          const blocks = state.sign.blocks.filter((block) => block.id !== id);
          if (blocks.length === state.sign.blocks.length) return state;
          return {
            sign: { ...state.sign, blocks },
            past: [...state.past, state.sign].slice(-LIMIT),
            future: [],
            selectedId: state.selectedId === id ? null : state.selectedId,
            boxes: without(state.boxes, id),
            wanted: without(state.wanted, id),
          };
        }),

      patch: (id, patch, discrete = true) => {
        const apply = (sign: Sign) => withBlock(sign, id, (block) => ({ ...block, ...patch }));
        if (discrete) get().commit(apply);
        else get().live(apply);
      },

      /*
        Measuring happens after every render, so this is the gate that stops the
        designer chasing its own tail: a measurement that has not moved leaves
        the stored object untouched, nothing re-renders, and the loop ends
        there. The tolerance is a hundredth of a millimetre — far below anything
        the workshop or the screen can tell apart, and well above the noise in a
        layout engine's sub-pixel arithmetic.
      */
      measured: (id, box) =>
        set((state) => {
          const current = state.boxes[id];
          if (!box) return current ? { boxes: without(state.boxes, id) } : state;
          if (current && same(current, box)) return state;
          return { boxes: { ...state.boxes, [id]: box } };
        }),

      want: (id, capMm) =>
        set((state) =>
          state.wanted[id] === capMm ? state : { wanted: { ...state.wanted, [id]: capMm } },
        ),
    }),
    {
      name: 'sign-draft',
      version: 1,
      storage: createJSONStorage(guardedStorage),
      /*
        Hydrated by hand, after mount, rather than during the first render.
        Reading storage while rendering would give the browser different markup
        from the one the server sent, which React reports as a hydration
        mismatch and repairs by throwing the server's work away.
      */
      skipHydration: true,
      // Only the sign is worth keeping. History, selection and measurements all
      // describe a session rather than a design.
      partialize: (state) => ({ sign: state.sign }),
      /*
        Rehydration writes state directly, going round every action and every
        rule they enforce. That is how a saved design once walked past all of
        them and drew itself off the edge of the board, so what comes out of
        storage is rebuilt field by field before it is allowed in.
      */
      merge: (saved, current) => ({
        ...current,
        sign:
          saved && typeof saved === 'object' && 'sign' in saved
            ? reviveSign((saved as { sign: unknown }).sign)
            : current.sign,
      }),
    },
  ),
);

/** Keeps a selection only while the block it points at still exists. */
function keepSelection(sign: Sign, selectedId: string | null): string | null {
  return selectedId && sign.blocks.some((block) => block.id === selectedId) ? selectedId : null;
}

function same(a: BlockBox, b: BlockBox): boolean {
  return (
    a.capMm === b.capMm &&
    Math.abs(a.widthMm - b.widthMm) < 0.01 &&
    Math.abs(a.heightMm - b.heightMm) < 0.01 &&
    Math.abs(a.offsetXMm - b.offsetXMm) < 0.01 &&
    Math.abs(a.offsetYMm - b.offsetYMm) < 0.01
  );
}

/** The selected block, or null. */
export function selectedBlock(state: { sign: Sign; selectedId: string | null }): TextBlock | null {
  return state.sign.blocks.find((block) => block.id === state.selectedId) ?? null;
}
