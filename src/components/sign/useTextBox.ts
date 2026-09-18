'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { getFont } from '@/config/carving-fonts';
import { safeArea, type Draft } from '@/lib/sign/draft';
import { useSign, type LetteringSize } from '@/lib/sign/store';

/** Smallest letters offered, whatever the face says. */
export const MIN_CAP_MM = 8;

/**
 * How big the lettering is, asked of the thing that drew it.
 *
 * The previous answer came from a font parser in the browser: read the TTF,
 * compose the glyphs by hand, union their bounding boxes. It was a great deal
 * of machinery to arrive at a number the renderer already knew, and it was
 * wrong in ways that were hard to see — a face the parser's shaper crashed on,
 * a serialiser that emitted NaN at particular sizes, a cap-height table off by
 * a quarter for one face.
 *
 * So this asks instead. `getBBox()` on the rendered `<text>` is the browser
 * reporting what it just laid out, with its own shaping, kerning and tracking
 * already in it.
 *
 * ── What the box is ────────────────────────────────────────────────────────
 *
 * Measured, not assumed: vertically the box is the *font* box — ascent plus
 * descent — and it does not change when a descender is typed. `H`, `HEM` and
 * `HEMp` all report the same height. Horizontally it is the exact advance.
 *
 * That is the right box to hold on to, for three reasons. The selection frame
 * stops jumping when a `p` is typed, which it would do if it hugged the ink.
 * The font box is strictly larger than the ink, so lettering kept inside the
 * board by this measurement cannot overflow it — the failure reported twice in
 * this designer's life. And it is the box every drawing program puts round
 * type, so it is the one people already read as "the text".
 *
 * What is kept is the size, and how far the box fell from the point that
 * placed it — nothing about where the block is. Position is state, and the
 * board anchors the text so that the measured box lands centred on it, so a
 * drag changes no measurement at all and the box can never lag the hand.
 */
export function useMeasuredLettering(
  capMm: number,
  anchorXMm: number,
  anchorYMm: number,
): (node: SVGTextElement | null) => void {
  const [node, setNode] = useState<SVGTextElement | null>(null);
  const measured = useSign((s) => s.measured);

  const measure = useCallback(() => {
    if (!node) {
      measured(null);
      return;
    }
    let box: DOMRect;
    try {
      // Throws in some engines when the element is not being rendered; an
      // unmeasurable sign should keep its last good size, not lose it.
      box = node.getBBox();
    } catch {
      return;
    }
    if (!(box.width > 0) || !(box.height > 0)) {
      measured(null);
      return;
    }
    // The cap height travels with the box because it is what makes the box
    // mean anything: React hands an effect the props of the render it belongs
    // to, so this is the size the text on screen was actually set at.
    measured({
      widthMm: box.width,
      heightMm: box.height,
      capMm,
      // Against the anchor this render used, which makes the offset a property
      // of the glyphs alone: the board can correct for it without the
      // correction changing what is being measured.
      offsetXMm: box.x + box.width / 2 - anchorXMm,
      offsetYMm: box.y + box.height / 2 - anchorYMm,
    });
  }, [node, measured, capMm, anchorXMm, anchorYMm]);

  /*
    After every render, with no dependency list, because every input to the
    layout is a reason to re-measure: the words, the face, the size, the
    tracking, the line spacing, the number of lines. Listing them would be a
    second copy of what the renderer already depends on, and the first thing to
    fall out of step. One `getBBox` on one element is cheap; the store ignores a
    measurement that has not changed, so this settles rather than loops.
  */
  useLayoutEffect(measure);

  // A webfont arriving replaces the metrics of everything already drawn.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let cancelled = false;
    const again = () => {
      if (!cancelled) measure();
    };
    document.fonts.ready.then(again).catch(() => {});
    document.fonts.addEventListener('loadingdone', again);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener('loadingdone', again);
    };
  }, [measure]);

  return setNode;
}

export interface CapLimits {
  min: number;
  max: number;
}

/**
 * How large and how small the lettering may be, in millimetres of capital.
 *
 * The ceiling is solved rather than searched for. Every dimension of the box
 * scales linearly with cap height — the font size does, and the tracking is a
 * fraction of the font size — so one measurement at the current size gives the
 * largest size that still fits the safe area, exactly, for this word in this
 * face on this board.
 *
 * The floor is the one estimate left in this designer. A face's narrowest
 * stroke is a property of its outlines, and finding it means measuring the
 * medial axis of every glyph, so the catalogue's declared ratio stands in. It
 * is advisory: a millimetre out costs a slightly conservative floor, not a sign
 * that cannot be cut.
 */
export function capLimits(draft: Draft, size: LetteringSize | null): CapLimits {
  const face = getFont(draft.block.fontId);
  const min = Math.max(MIN_CAP_MM, Math.ceil(0.8 / face.strokeRatio));

  if (!size || size.widthMm <= 0 || size.heightMm <= 0) {
    return { min, max: Math.max(min, 200) };
  }

  const safe = safeArea(draft);
  const fit = Math.min(safe.width / size.widthMm, safe.height / size.heightMm);
  return { min, max: Math.max(Math.floor(size.capMm * fit), min) };
}

/**
 * How far the letters may grow back before it is worth moving them.
 *
 * Set type is very nearly proportional to its cap height, but not exactly:
 * hinting and sub-pixel rounding move a measured box by a fraction either way.
 * Without a dead band, a block sitting at its ceiling can measure one
 * millimetre larger at the new size, shrink, measure smaller again, and grow —
 * a twitch that never settles. Two millimetres of slack ends it, at the cost of
 * occasionally stopping a millimetre below the theoretical maximum, which is
 * a millimetre nobody will see.
 */
const GROW_SLACK_MM = 2;

/**
 * Keeps the lettering inside a board that has changed underneath it, and brings
 * it back when the board makes room again.
 *
 * Choosing a smaller board, or a shape that gives up more of its corners, does
 * not touch the lettering — so without this the text stays exactly as large and
 * exactly where it was, and hangs over the edge. That is the failure this
 * designer shipped twice, in two different disguises, and the cause both times
 * was the same: a rule applied where a value is entered rather than wherever
 * the value can become wrong.
 *
 * Shrinking alone is not enough, though, and shipping only half of this is what
 * made the designer feel like it was fighting back. Type a long name and the
 * letters shrink to fit, as they must; delete it, type a short one, and the
 * sign keeps the small letters a word that is no longer there imposed on it.
 * Every other tool would have grown them again. So the size the customer asked
 * for is remembered, and the letters return to it as soon as there is room.
 */
export function useFitLettering(draft: Draft, size: LetteringSize | null): void {
  const { max } = capLimits(draft, size);
  const capHeightMm = draft.block.capHeightMm;
  const wantedCapMm = useSign((s) => s.wantedCapMm);

  useEffect(() => {
    if (!size) return;
    const safe = safeArea(draft);

    const target =
      capHeightMm > max
        ? max
        : wantedCapMm > capHeightMm && max >= capHeightMm + GROW_SLACK_MM
          ? Math.min(wantedCapMm, max)
          : capHeightMm;

    // Worked out at the size it is about to become, so that position and size
    // are not corrected against two different pictures of the same block.
    const scale = target / capHeightMm;
    const half = { x: (size.widthMm * scale) / 2, y: (size.heightMm * scale) / 2 };
    const x = clamp(draft.block.xMm, safe.x + half.x, safe.x + safe.width - half.x);
    const y = clamp(draft.block.yMm, safe.y + half.y, safe.y + safe.height - half.y);

    if (target === capHeightMm && x === draft.block.xMm && y === draft.block.yMm) return;

    useSign.getState().live((current) => ({
      ...current,
      block: { ...current.block, capHeightMm: target, xMm: x, yMm: y },
    }));
    // The draft is read through the values that can make it wrong; listing the
    // whole object would re-run this on every keystroke for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    max,
    capHeightMm,
    wantedCapMm,
    size,
    draft.widthMm,
    draft.heightMm,
    draft.block.xMm,
    draft.block.yMm,
  ]);
}

/** Centres the value when the box is wider than the room it has. */
function clamp(value: number, low: number, high: number): number {
  return low > high ? (low + high) / 2 : Math.min(Math.max(value, low), high);
}
