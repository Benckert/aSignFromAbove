'use client';

import { create } from 'zustand';
import { defaultDraft, type Draft, type TextBlock } from './draft';

/**
 * The draft, and the history of it.
 *
 * Undo is written here rather than pulled in as a middleware, for one reason
 * that matters: a drag is one action to a person and several hundred state
 * changes to a program. A generic history records every one of them, so undoing
 * a drag means pressing the key three hundred times. The distinction between
 * `commit` and `live` below is the whole design — a commit is a thing the
 * customer did, a live change is the tool keeping up with their hand.
 */

const LIMIT = 50;

/**
 * How big the lettering came out, in board millimetres.
 *
 * A measurement rather than a setting: the browser lays the text out and this
 * is what it reports. It lives here because three separate parts of the
 * designer need the same answer — the board draws a frame round it, the size
 * control works out how large the letters may still be, and the fit rule keeps
 * them inside the wood — and two of them cannot see the element that was
 * measured. One measurement, one answer.
 *
 * Only the size. Position is state, not measurement.
 */
export interface LetteringSize {
  widthMm: number;
  heightMm: number;
  /**
   * The cap height the measurement was taken at.
   *
   * Carried with it because a box without the size it was measured at cannot be
   * scaled, and scaling it is the whole point: every dimension of set type is
   * proportional to the cap height, so one measurement solves for the largest
   * cap that still fits the board. Reading the current cap out of the draft
   * instead would pair a new size with last frame's box for one render, and
   * that one render is enough to snap the letters to the wrong size.
   */
  capMm: number;
  /**
   * How far the box's centre fell from the point the text was anchored at.
   *
   * Usually nothing. `getBBox` returns the font's own box, which is centred on
   * the anchor — but it returns the union of that box and the ink, and ink can
   * escape it: a ring over an Å reaches higher than the font declares its
   * ascent to be, and a script face's swashes hang past the end of the advance.
   * Then the box grows on one side only and is no longer centred on the point
   * that placed it.
   *
   * Small — a millimetre and a half at sign sizes — and it would have gone
   * unnoticed. It is corrected because the letters it happens to are Å, Ä and
   * Ö, which is to say most Swedish signs, and because a designer that is
   * exact about where the words are has one less thing to be wrong about.
   */
  offsetXMm: number;
  offsetYMm: number;
}

interface SignStore {
  draft: Draft;
  past: Draft[];
  future: Draft[];

  /** A discrete change: typing, picking a face, releasing a drag. Undoable. */
  commit: (change: (draft: Draft) => Draft) => void;
  /** A continuous change during a gesture. Not recorded. */
  live: (change: (draft: Draft) => Draft) => void;
  /** Records the state a gesture is about to move away from. */
  mark: () => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;

  /** Whether the lettering is selected. Nothing else is selectable yet. */
  selected: boolean;
  select: (selected: boolean) => void;

  /** Null when there is nothing written, or before the first measurement. */
  size: LetteringSize | null;
  measured: (size: LetteringSize | null) => void;

  /**
   * The cap height the customer last asked for, which is not always the one
   * they have got.
   *
   * A long word has to shrink to fit the board. Without this, shortening it
   * again leaves the letters small — the sign quietly keeps the size that a
   * word which is no longer there forced on it, and the only way back is to
   * find the size control and undo the tool's own decision. So the request is
   * remembered separately from the result, and the letters return to it as
   * soon as there is room.
   *
   * Not part of the draft: it is what was asked for, not what will be cut, and
   * nothing downstream of the designer should ever see it. It starts at the
   * default sign's own cap height, because that too is a request — the one the
   * designer opens with — and a sign that could never grow back past whatever
   * the first long word forced on it would be the same trap by a quieter route.
   *
   * Undo leaves it alone. Undo restores a size; this is the size that was
   * asked for, and the two are only the same when the ask was the last thing
   * that happened. It can only ever let the letters grow, never shrink them,
   * so a stale request cannot overrule a smaller size the customer has since
   * chosen.
   */
  wantedCapMm: number;
  want: (capMm: number) => void;
}

export const useSign = create<SignStore>((set, get) => ({
  draft: defaultDraft(),
  past: [],
  future: [],
  selected: false,
  size: null,
  wantedCapMm: defaultDraft().block.capHeightMm,

  mark: () =>
    set((state) => ({
      past: [...state.past, state.draft].slice(-LIMIT),
      future: [],
    })),

  commit: (change) =>
    set((state) => {
      const draft = change(state.draft);
      if (draft === state.draft) return state;
      return {
        draft,
        past: [...state.past, state.draft].slice(-LIMIT),
        future: [],
      };
    }),

  live: (change) => set((state) => ({ draft: change(state.draft) })),

  undo: () => {
    const { past, draft, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    set({
      draft: previous,
      past: past.slice(0, -1),
      future: [draft, ...future].slice(0, LIMIT),
      wantedCapMm: defaultDraft().block.capHeightMm,
    });
  },

  redo: () => {
    const { past, draft, future } = get();
    const [next, ...rest] = future;
    if (!next) return;
    set({ draft: next, past: [...past, draft].slice(-LIMIT), future: rest });
  },

  reset: () =>
    set({
      draft: defaultDraft(),
      past: [],
      future: [],
      selected: false,
      size: null,
      wantedCapMm: defaultDraft().block.capHeightMm,
    }),

  select: (selected) => set({ selected }),

  /*
    Measuring happens after every render, so this is the gate that stops the
    designer chasing its own tail: a measurement that has not moved leaves the
    stored object untouched, nothing re-renders, and the loop ends there. The
    tolerance is a hundredth of a millimetre — far below anything the workshop
    or the screen can tell apart, and well above the noise in a layout engine's
    sub-pixel arithmetic.
  */
  measured: (size) =>
    set((state) => {
      const current = state.size;
      if (!size) return current === null ? state : { size: null };
      if (
        current &&
        current.capMm === size.capMm &&
        Math.abs(current.widthMm - size.widthMm) < 0.01 &&
        Math.abs(current.heightMm - size.heightMm) < 0.01 &&
        Math.abs(current.offsetXMm - size.offsetXMm) < 0.01 &&
        Math.abs(current.offsetYMm - size.offsetYMm) < 0.01
      ) {
        return state;
      }
      return { size };
    }),

  want: (capMm) => set({ wantedCapMm: capMm }),
}));

/** Applies a patch to the lettering, leaving the rest of the sign alone. */
export function patchBlock(patch: Partial<TextBlock>) {
  return (draft: Draft): Draft => ({ ...draft, block: { ...draft.block, ...patch } });
}
