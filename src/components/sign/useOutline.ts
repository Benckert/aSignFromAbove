'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { getFont } from '@/config/carving-fonts';
import { loadedFace, loadFace } from '@/lib/sign/faces';
import { outlineBlock, type Outline } from '@/lib/sign/outline';
import { safeArea, type Draft } from '@/lib/sign/draft';

/** Smallest letters offered, whatever the face says. */
export const MIN_CAP_MM = 8;

/**
 * The lettering's outline, recomputed when anything about it changes.
 *
 * The face is read straight out of the module cache during render, so a font
 * already in hand draws on the first pass with no flicker. When it is not, the
 * fetch is started and the component nudged once it lands — which is why this
 * is not an effect that copies the font into state: the cache is the source of
 * truth, and a copy of it would go stale the moment two things shared a face.
 *
 * Both the board and the controls call this. The layout runs again for each,
 * which for a line or two of text is a fraction of a millisecond, and is worth
 * it to have exactly one answer to "how big is this text" in the application.
 */
export function useOutline(draft: Draft): Outline | null {
  const { block } = draft;
  const face = getFont(block.fontId);
  const font = loadedFace(block.fontId);
  const [, nudge] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (font) return;
    let cancelled = false;
    loadFace(block.fontId)
      .then(() => {
        if (!cancelled) nudge();
      })
      .catch(() => {
        /* A face that will not load leaves the board blank rather than broken. */
      });
    return () => {
      cancelled = true;
    };
  }, [block.fontId, font]);

  const text = face.capsOnly ? block.text.toUpperCase() : block.text;

  return useMemo(() => {
    if (!font) return null;
    return outlineBlock(font, {
      text,
      capHeightMm: block.capHeightMm,
      trackingEm: block.trackingEm,
      lineSpacing: block.lineSpacing,
      align: block.align,
    });
  }, [font, text, block.capHeightMm, block.trackingEm, block.lineSpacing, block.align]);
}

export interface CapLimits {
  min: number;
  max: number;
}

/**
 * How large and how small the lettering may be, in millimetres of capital.
 *
 * The ceiling is measured rather than estimated. Ink scales linearly with cap
 * height — tracking is a fraction of the em, so it scales too — which means one
 * measurement of the current size solves for the largest that still fits the
 * safe area, exactly, for this particular word in this particular face.
 *
 * The floor is the one estimate left anywhere in this designer. A face's
 * narrowest stroke is a property of its outlines, but finding it means
 * measuring the medial axis of every glyph, so the catalogue's declared ratio
 * still stands in. It is advisory: a millimetre out here costs a slightly
 * conservative floor, not a sign that cannot be cut.
 */
export function capLimits(draft: Draft, outline: Outline | null): CapLimits {
  const face = getFont(draft.block.fontId);
  const min = Math.max(MIN_CAP_MM, Math.ceil(0.8 / face.strokeRatio));

  if (!outline || outline.box.width <= 0 || outline.box.height <= 0) {
    return { min, max: Math.max(min, 200) };
  }

  const safe = safeArea(draft);
  const fit = Math.min(safe.width / outline.box.width, safe.height / outline.box.height);
  return { min, max: Math.max(Math.floor(draft.block.capHeightMm * fit), min) };
}
