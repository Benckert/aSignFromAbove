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
}

export const useSign = create<SignStore>((set, get) => ({
  draft: defaultDraft(),
  past: [],
  future: [],
  selected: false,

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
    set({ draft: previous, past: past.slice(0, -1), future: [draft, ...future].slice(0, LIMIT) });
  },

  redo: () => {
    const { past, draft, future } = get();
    const [next, ...rest] = future;
    if (!next) return;
    set({ draft: next, past: [...past, draft].slice(-LIMIT), future: rest });
  },

  reset: () => set({ draft: defaultDraft(), past: [], future: [], selected: false }),

  select: (selected) => set({ selected }),
}));

/** Applies a patch to the lettering, leaving the rest of the sign alone. */
export function patchBlock(patch: Partial<TextBlock>) {
  return (draft: Draft): Draft => ({ ...draft, block: { ...draft.block, ...patch } });
}
