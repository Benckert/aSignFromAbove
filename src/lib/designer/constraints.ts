import { CARVING_FONTS, getFont, type CarvingFont } from '@/config/carving-fonts';
import { WOODS, type Wood } from '@/config/woods';
import { BITS, MACHINE } from '@/config/router-profile';
import type { CarveMethod, Finish, SignDesign, TextBlock } from './types';
import {
  baselineLengthMm,
  decorationDepthMm,
  maxCapHeightMm,
  maxCircleRadiusMm,
  maxCurvature,
  MIN_CURVATURE,
  safeArea,
} from './geometry';

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

/** The area of the board this design's lettering may occupy. */
function textArea(design: SignDesign) {
  return safeArea(
    design.shape,
    design.widthMm,
    design.heightMm,
    decorationDepthMm(design.decoration),
  );
}

function lineCountOf(block: TextBlock): number {
  return Math.max(block.content.split('\n').length, 1);
}

/**
 * The range the text-size slider is allowed to cover.
 *
 * The floor comes from physics: below it, the narrowest stroke in the face is
 * thinner than the cutter, and the letter cannot be cut. The ceiling comes from
 * the board: above it, some part of the block runs off the edge. Between the
 * two, every value is buildable — which is why there is no overflow warning
 * anywhere in the app.
 *
 * "Some part of the block" is doing real work in that sentence. A line of text
 * is not a rectangle of its own cap height: it has descenders below it, a bow
 * lifts its letters clear of the curve they sit on, and a ring of text is as
 * wide as its diameter plus two letters. All three are counted here, which is
 * what stopped a 40 mm circle at radius 78 being offered on a 220 mm board.
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

  const area = textArea(design);

  const fitCeiling = Math.floor(
    maxCapHeightMm({
      wrap: block.wrap,
      lineHeight: block.lineHeight,
      lineCount: lineCountOf(block),
      curvature: block.curvature,
      circleRadiusMm: block.circleRadiusMm,
      areaWidthMm: area.width,
      areaHeightMm: area.height,
    }),
  );

  // Ceiling from the words themselves, once the browser has measured them.
  const available = baselineLengthMm({
    wrap: block.wrap,
    capHeightMm: block.capHeightMm,
    curvature: block.curvature,
    circleRadiusMm: block.circleRadiusMm,
    areaWidthMm: area.width,
  });
  const widthCeiling =
    widthAt100mm && widthAt100mm > 0
      ? Math.floor((available / widthAt100mm) * 100 * 0.98)
      : Infinity;

  const max = Math.max(min, Math.min(fitCeiling, widthCeiling, 220));
  return { min, max };
}

/**
 * How hard a bowed line may be bent, given the board and the letters on it.
 *
 * Bend and letter height compete for the same millimetres, so one of them has
 * to give way. Letter height wins: a sign exists to be read from the road, and
 * the bend is a flourish. So this ceiling moves with the chosen size, and the
 * size ceiling moves with the chosen bend — each slider stops where the other
 * currently stands, and neither can push the text off the board.
 */
export function curvatureRange(design: SignDesign, block: TextBlock) {
  const area = textArea(design);
  const max = maxCurvature({
    capHeightMm: block.capHeightMm,
    lineHeight: block.lineHeight,
    lineCount: lineCountOf(block),
    areaWidthMm: area.width,
    areaHeightMm: area.height,
  });
  return { min: MIN_CURVATURE, max: Math.max(max, MIN_CURVATURE) };
}

/** The smallest ring worth offering. Below it the text stops reading as a ring. */
export const MIN_CIRCLE_RADIUS_MM = 20;

/** How wide a ring of text may be before it leaves the board. */
export function circleRadiusRange(design: SignDesign, block: TextBlock) {
  const area = textArea(design);
  const max = Math.floor(
    maxCircleRadiusMm({
      capHeightMm: block.capHeightMm,
      areaWidthMm: area.width,
      areaHeightMm: area.height,
    }),
  );
  return { min: MIN_CIRCLE_RADIUS_MM, max: Math.max(max, MIN_CIRCLE_RADIUS_MM) };
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

  // No block carries more lines than a sign can wear. Done before anything is
  // measured, since the line count feeds every ceiling below.
  const trimmed = next.texts.map((block) => {
    const content = limitLines(block.content);
    return content === block.content ? block : { ...block, content };
  });
  if (trimmed.some((t, i) => t !== next.texts[i])) next = { ...next, texts: trimmed };

  /*
    Bend, ring and size all have to fit the same board, and a change to the
    board can break all three at once — shrink a sign, or deepen its border,
    and a ring set for the old one now hangs over the edge.

    They are corrected in order of what is worth losing. The flourish goes
    first: bend, then ring size, and only then the letters themselves, which
    are the point of the sign. Each step is computed against the values the
    step before it settled, so one pass is enough and the result is stable —
    loosening one constraint never re-tightens an earlier one.
  */
  next = mapTexts(next, (block) => {
    if (block.wrap !== 'arcUp' && block.wrap !== 'arcDown') return block;
    const { min, max } = curvatureRange(next, block);
    const curvature = clamp(block.curvature, min, max);
    return curvature === block.curvature ? block : { ...block, curvature };
  });

  next = mapTexts(next, (block) => {
    if (block.wrap !== 'circle') return block;
    const { min, max } = circleRadiusRange(next, block);
    const circleRadiusMm = clamp(block.circleRadiusMm, min, max);
    return circleRadiusMm === block.circleRadiusMm ? block : { ...block, circleRadiusMm };
  });

  // Width measurement is not available here, so this enforces the floor and
  // everything the board dictates; the ceiling that depends on the actual
  // glyphs is applied by the slider, which can measure them.
  next = mapTexts(next, (block) => {
    const { min, max } = capHeightRange(next, block);
    const capHeightMm = clamp(block.capHeightMm, min, max);
    return capHeightMm === block.capHeightMm ? block : { ...block, capHeightMm };
  });

  return next;
}

/** Applies a correction to every block, keeping the design's identity if none applied. */
function mapTexts(design: SignDesign, fn: (block: TextBlock) => TextBlock): SignDesign {
  const texts = design.texts.map(fn);
  return texts.some((t, i) => t !== design.texts[i]) ? { ...design, texts } : design;
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
