import { CARVING_FONTS, getFont, type CarvingFont } from '@/config/carving-fonts';
import { WOODS, type Wood, type WoodId } from '@/config/woods';
import { BITS, MACHINE } from '@/config/router-profile';
import type { CarveMethod, Finish, Placement, SignDesign, TextBlock } from './types';
import { safeArea } from './geometry';

/**
 * What can actually be built, given what has been chosen so far.
 *
 * The designer does not warn people about impossible signs — it declines to
 * offer them. A face whose strokes are narrower than the bit can enter is not
 * in the list. A cap height that would not fit the board is not on the slider.
 * A timber that will not survive outdoors disappears the moment the sign is
 * destined for outdoors.
 *
 * This is a better bargain than a warning panel. Warnings ask the customer to
 * understand router geometry before they can trust their own configuration;
 * constraints mean anything they can reach is something the workshop can make.
 *
 * The one cost is that a choice made earlier can be invalidated by a choice
 * made later — pick walnut, then pick outdoors. `reconcile` below handles that
 * by correcting the design rather than blocking the second choice, because the
 * thing the customer just touched is the thing they meant.
 */

/* ── Cutting methods ──────────────────────────────────────────────────── */

export function availableMethods(placement: Placement): CarveMethod[] {
  // Raised letters hold water on their top faces, so they are not offered for
  // a sign that lives out in the weather.
  return placement === 'outdoor'
    ? ['vcarve', 'pocket']
    : ['vcarve', 'pocket', 'raised'];
}

/* ── Timbers ──────────────────────────────────────────────────────────── */

export function availableWoods(placement: Placement): Wood[] {
  if (placement === 'indoor') return WOODS;
  // Under cover is gentler than full exposure, but both need a timber that
  // tolerates moving air and damp.
  return WOODS.filter((w) => w.outdoorSuitable);
}

/* ── Finishes ─────────────────────────────────────────────────────────── */

export function availableFinishes(placement: Placement): Finish[] {
  // Bare timber outdoors is a legitimate choice and greys handsomely, so it
  // stays. Everything on offer works in every position.
  return placement === 'outdoor'
    ? ['oil', 'paint', 'oilPaint', 'raw']
    : ['raw', 'oil', 'paint', 'oilPaint'];
}

/* ── Faces ────────────────────────────────────────────────────────────── */

/** The bit that clears material for a given method. */
function bitFor(method: CarveMethod) {
  return method === 'vcarve'
    ? BITS.find((b) => b.id === 'v60')!
    : BITS.find((b) => b.id === 'em3')!;
}

/**
 * The faces worth offering for a given cutting method.
 *
 * A face rated 'caution' for a method is one whose result would disappoint, so
 * it is left out rather than offered with a caveat.
 */
export function availableFonts(method: CarveMethod): CarvingFont[] {
  const fonts = CARVING_FONTS.filter((f) => f.suitability[method] !== 'caution');
  // Never return an empty picker, whatever the ratings table says.
  return fonts.length > 0 ? fonts : CARVING_FONTS;
}

/* ── Text size ────────────────────────────────────────────────────────── */

export interface CapHeightRange {
  /** Smallest cap height the bit can hold the face's detail at. */
  min: number;
  /** Largest cap height that still fits inside the safe area of the board. */
  max: number;
}

/**
 * The range the text-size slider is allowed to cover.
 *
 * The floor comes from physics: below it, the narrowest stroke in the face is
 * thinner than the cutter, and the letter cannot be cut. The ceiling comes from
 * the board: above it, the line runs off the edge. Between the two, every value
 * is buildable — which is why there is no overflow warning anywhere in the app.
 */
export function capHeightRange(
  design: SignDesign,
  block: TextBlock,
  /** Measured width of the block at a 100 mm cap height, from the browser. */
  widthAt100mm?: number,
): CapHeightRange {
  const font = getFont(block.fontId);
  const bit = bitFor(design.method);

  // Floor: whichever is stricter — what the bit can enter, or the size below
  // which the face stops looking like itself.
  const strokeFloor = Math.ceil(bit.minStrokeMm / font.strokeRatio);
  const min = Math.max(strokeFloor, font.minCapHeightMm);

  const area = safeArea(design.shape, design.widthMm, design.heightMm);

  // Ceiling from height: the whole block, however many lines, must fit.
  const lineCount = Math.max(block.content.split('\n').length, 1);
  const heightCeiling = Math.floor(
    area.height / ((lineCount - 1) * block.lineHeight + 1),
  );

  // Ceiling from width, once the browser has measured the actual glyphs.
  const available = block.wrap === 'straight' ? area.width : area.width * 0.92;
  const widthCeiling =
    widthAt100mm && widthAt100mm > 0
      ? Math.floor((available / widthAt100mm) * 100 * 0.98)
      : Infinity;

  const max = Math.max(min, Math.min(heightCeiling, widthCeiling, 220));
  return { min, max };
}

/* ── Reconciliation ───────────────────────────────────────────────────── */

/**
 * Brings a design back inside the rules after a change that broke them.
 *
 * Called on every edit. It always preserves the field the customer just
 * touched and adjusts whatever that made impossible — moving a sign outdoors
 * swaps the timber rather than refusing the move.
 *
 * Returns the same object when nothing needed changing, so React can skip the
 * re-render.
 */
export function reconcile(design: SignDesign): SignDesign {
  let next = design;
  const change = <K extends keyof SignDesign>(key: K, value: SignDesign[K]) => {
    if (next[key] !== value) next = { ...next, [key]: value };
  };

  // Timber must suit where the sign will live.
  const woods = availableWoods(next.placement);
  if (!woods.some((w) => w.id === next.woodId)) {
    change('woodId', (woods[0]?.id ?? 'ek') as WoodId);
  }

  // Method must suit where the sign will live.
  const methods = availableMethods(next.placement);
  if (!methods.includes(next.method)) change('method', methods[0]);

  // Finish must be on offer.
  const finishes = availableFinishes(next.placement);
  if (!finishes.includes(next.finish)) change('finish', finishes[0]);

  // Every face in use must suit the method.
  const fonts = availableFonts(next.method);
  const fontIds = new Set(fonts.map((f) => f.id));
  if (next.texts.some((t) => !fontIds.has(t.fontId))) {
    next = {
      ...next,
      texts: next.texts.map((t) =>
        fontIds.has(t.fontId) ? t : { ...t, fontId: fonts[0].id },
      ),
    };
  }

  // The border cannot be inset past the middle of the board.
  const maxInset = Math.floor(Math.min(next.widthMm, next.heightMm) / 2) - 5;
  if (next.decoration.insetMm > maxInset) {
    next = { ...next, decoration: { ...next.decoration, insetMm: Math.max(maxInset, 4) } };
  }

  // Sizes stay inside the machine.
  const w = clamp(next.widthMm, MACHINE.minSignMm.width, MACHINE.workAreaMm.width);
  const h = clamp(next.heightMm, MACHINE.minSignMm.height, MACHINE.workAreaMm.height);
  change('widthMm', w);
  change('heightMm', h);

  // Text sizes stay inside their allowed range. Width measurement is not
  // available here, so this enforces the floor and the height ceiling; the
  // width ceiling is applied by the slider, which can measure.
  const corrected = next.texts.map((block) => {
    const { min, max } = capHeightRange(next, block);
    const capped = clamp(block.capHeightMm, min, max);
    return capped === block.capHeightMm ? block : { ...block, capHeightMm: capped };
  });
  if (corrected.some((t, i) => t !== next.texts[i])) next = { ...next, texts: corrected };

  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The only thing left that can stop an order: nothing has been written yet. */
export function isOrderable(design: SignDesign): boolean {
  return design.texts.some((t) => t.content.trim().length > 0) || design.artwork !== null;
}
