import { CARVING_FONTS, getFont, type CarvingFont } from '@/config/carving-fonts';
import { WOODS, type Wood } from '@/config/woods';
import { BITS, MACHINE } from '@/config/router-profile';
import type { CarveMethod, Finish, SignDesign, TextBlock } from './types';
import { decorationDepthMm, safeArea } from './geometry';

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
 * made later — pick a delicate face, then pick a cutting method it cannot take.
 * `reconcile` below handles that by correcting the earlier choice rather than
 * blocking the new one, because the thing just touched is the thing meant.
 *
 * Note what is deliberately *not* constrained: timber against weather. Whether
 * a sign lives indoors or out is a question about the customer's house, not
 * about the machine, and asking it bought one more decision for every visitor
 * in order to help a few. The timbers say how they age, and the finish choice
 * is where that decision actually gets made.
 */

/* ── Cutting methods, timbers and finishes ───────────────────────────── */

/**
 * All three cuts, every timber and every finish are always on offer.
 *
 * These stay as functions rather than being inlined at their call sites: they
 * are the seam where a genuine restriction would go if one ever appeared (a
 * timber out of stock, a bit away being sharpened), and the interface already
 * reads from them.
 */
export function availableMethods(): CarveMethod[] {
  return ['vcarve', 'pocket', 'raised'];
}

export function availableWoods(): Wood[] {
  return WOODS;
}

export function availableFinishes(): Finish[] {
  return ['raw', 'oil', 'paint', 'oilPaint'];
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

  const area = safeArea(
    design.shape,
    design.widthMm,
    design.heightMm,
    decorationDepthMm(design.decoration),
  );

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
 * touched and adjusts whatever that made impossible — switching to a cut a
 * face cannot take swaps the face rather than refusing the cut.
 *
 * Returns the same object when nothing needed changing, so React can skip the
 * re-render.
 */
export function reconcile(design: SignDesign): SignDesign {
  let next = design;
  const change = <K extends keyof SignDesign>(key: K, value: SignDesign[K]) => {
    if (next[key] !== value) next = { ...next, [key]: value };
  };

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

  // No block carries more lines than a sign can wear.
  const trimmed = next.texts.map((block) => {
    const content = limitLines(block.content);
    return content === block.content ? block : { ...block, content };
  });
  if (trimmed.some((t, i) => t !== next.texts[i])) next = { ...next, texts: trimmed };

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

/**
 * The most lines one block of text may carry.
 *
 * Three is a practical ceiling rather than an arbitrary one: past it the
 * lettering has to shrink so far to fit a board that it stops being a carved
 * sign and starts being a paragraph cut into wood. Anyone who genuinely needs
 * more is doing something the enquiry form handles better than this tool.
 */
export const MAX_TEXT_LINES = 3;

/** Trims a block of text to the line limit, keeping what was typed first. */
export function limitLines(content: string): string {
  const lines = content.split('\n');
  return lines.length <= MAX_TEXT_LINES ? content : lines.slice(0, MAX_TEXT_LINES).join('\n');
}

/** The only thing left that can stop an order: nothing has been written yet. */
export function isOrderable(design: SignDesign): boolean {
  return design.texts.some((t) => t.content.trim().length > 0) || design.artwork !== null;
}
