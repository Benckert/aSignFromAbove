'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Artwork, Decoration, SignDesign, TextBlock } from './types';
import { defaultDesign, makeTextBlock, PRESETS } from './defaults';
import { reconcile } from './constraints';

/**
 * Designer state.
 *
 * The in-progress design is kept in the browser's localStorage so that a
 * customer who closes the tab halfway through does not lose their work. That
 * storage holds only what the customer typed into the designer — no identity,
 * no tracking, and it never leaves the device until they choose to send an
 * order. Under ePrivacy it is storage strictly necessary for a service the
 * user explicitly requested, so it needs no consent banner; it is described
 * plainly in the cookie policy regardless.
 */

const STORAGE_KEY = 'asfa.design.v1';

/** Whether a design was left behind by an earlier visit. */
export function hasSavedDesign(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Private mode, or a browser set to block site data.
    return false;
  }
}

interface DesignerState {
  design: SignDesign;
  /** Which text block the side panel is editing. */
  activeTextId: string | null;
  /** Suppresses the restored-design notice once it has been seen. */
  restored: boolean;

  set: (patch: Partial<SignDesign>) => void;
  setDecoration: (patch: Partial<Decoration>) => void;
  updateText: (id: string, patch: Partial<TextBlock>) => void;
  addText: () => void;
  removeText: (id: string) => void;
  /** Puts a removed block back, for the undo action on the toast. */
  restoreText: (block: TextBlock, index: number) => void;
  setActiveText: (id: string | null) => void;
  setArtwork: (artwork: Artwork | null) => void;
  applyPreset: (presetId: string) => void;
  reset: () => void;
  loadDesign: (design: SignDesign) => void;
  acknowledgeRestore: () => void;
}

export const useDesigner = create<DesignerState>()(
  persist(
    (set, get) => ({
      design: defaultDesign(),
      activeTextId: null,
          restored: false,

      /*
        Every mutation goes through reconcile, so the design in the store is
        always one the workshop could build. That is what lets the interface
        drop its warning panel: an impossible state cannot be reached, rather
        than being reached and then complained about.
      */
      set: (patch) => set((s) => ({ design: reconcile({ ...s.design, ...patch }) })),

      setDecoration: (patch) =>
        set((s) => ({
          design: reconcile({ ...s.design, decoration: { ...s.design.decoration, ...patch } }),
        })),

      updateText: (id, patch) =>
        set((s) => ({
          design: reconcile({
            ...s.design,
            texts: s.design.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          }),
        })),

      addText: () => {
        const block = makeTextBlock({
          content: '',
          capHeightMm: 24,
          // Drop new blocks below the existing ones rather than on top of them.
          y: Math.min(0.5 + get().design.texts.length * 0.16, 0.88),
        });
        set((s) => ({
          design: reconcile({ ...s.design, texts: [...s.design.texts, block] }),
          activeTextId: block.id,
        }));
      },

      removeText: (id) =>
        set((s) => ({
          design: { ...s.design, texts: s.design.texts.filter((t) => t.id !== id) },
          activeTextId: s.activeTextId === id ? null : s.activeTextId,
        })),

      restoreText: (block, index) =>
        set((s) => {
          const texts = [...s.design.texts];
          texts.splice(Math.min(index, texts.length), 0, block);
          return { design: { ...s.design, texts }, activeTextId: block.id };
        }),

      setActiveText: (id) => set({ activeTextId: id }),

      setArtwork: (artwork) => set((s) => ({ design: { ...s.design, artwork } })),

      applyPreset: (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        // Clone so the preset objects are never mutated by later edits.
        set({
          design: reconcile(structuredClone(preset.design)),
          activeTextId: null,
                });
      },

      reset: () => set({ design: reconcile(defaultDesign()), activeTextId: null }),

      loadDesign: (design) => set({ design: reconcile(design), activeTextId: null }),

      acknowledgeRestore: () => set({ restored: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the design is worth keeping; UI state should start fresh.
      partialize: (state) => ({ design: state.design }),
      /*
        localStorage is synchronous, so without this the store would come back
        already carrying the saved design before React's first client render —
        which would then disagree with the HTML the server sent and trigger a
        hydration mismatch. Instead the store starts at the default on both
        sides, and the designer calls rehydrate() once it has mounted.
      */
      skipHydration: true,

      /*
        A restored design goes through the same constraints as a typed one.

        This is the hole that let a sign come back from storage with its
        lettering hanging over the edges. Every action above runs `reconcile`,
        and the claim that an impossible design cannot be reached rested on
        that — but rehydration is not an action. It writes the stored object
        into the store directly, so a design saved before a rule existed, or
        saved under a rule that has since been tightened, arrived exempt from
        both. Anything that has been away from the store and comes back is a
        design from somewhere else, and is treated as one.
      */
      merge: (persisted, current) => {
        const saved = (persisted as { design?: SignDesign } | undefined)?.design;
        return { ...current, design: saved ? reconcile(saved) : current.design };
      },
    },
  ),
);
