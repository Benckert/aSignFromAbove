import type { Decoration, SignShape, TextWrap } from './types';

/**
 * Geometry for the sign preview.
 *
 * Everything works in millimetres. The preview SVG uses a viewBox measured in
 * millimetres too, so a number here is the same number on the finished board
 * and there is never a scale factor to reason about.
 */

/** Builds the outline of the blank as an SVG path. */
export function signOutlinePath(shape: SignShape, w: number, h: number): string {
  switch (shape) {
    case 'rect':
      return `M 0 0 H ${w} V ${h} H 0 Z`;

    case 'rounded': {
      // A corner radius proportional to the board, capped so long thin signs
      // do not end up as lozenges.
      const r = Math.min(w, h) * 0.08;
      return [
        `M ${r} 0`,
        `H ${w - r}`,
        `A ${r} ${r} 0 0 1 ${w} ${r}`,
        `V ${h - r}`,
        `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
        `H ${r}`,
        `A ${r} ${r} 0 0 1 0 ${h - r}`,
        `V ${r}`,
        `A ${r} ${r} 0 0 1 ${r} 0`,
        'Z',
      ].join(' ');
    }

    case 'arch': {
      // A flat-sided board with a segmental arch across the top. The arch rises
      // by a fifth of the height, which reads as a sign rather than a tombstone.
      const rise = Math.min(h * 0.2, w * 0.35);
      const radius = (w * w) / (8 * rise) + rise / 2;
      return [
        `M 0 ${rise}`,
        `A ${radius} ${radius} 0 0 1 ${w} ${rise}`,
        `V ${h}`,
        `H 0`,
        'Z',
      ].join(' ');
    }

    case 'oval': {
      const rx = w / 2;
      const ry = h / 2;
      return [
        `M 0 ${ry}`,
        `A ${rx} ${ry} 0 0 1 ${w} ${ry}`,
        `A ${rx} ${ry} 0 0 1 0 ${ry}`,
        'Z',
      ].join(' ');
    }
  }
}

/**
 * How far in from the edge of the board the decoration reaches, in millimetres.
 *
 * Not just the inset: a carved border is a groove with width, a double border
 * has a second line inboard of the first, and corner motifs sit inboard again.
 * Lettering has to clear all of it.
 */
export function decorationDepthMm(decoration: Decoration): number {
  const { border, corners, insetMm } = decoration;
  if (border === 'none' && corners === 'none') return 0;

  // Half the groove, plus a little air so the text is not touching the line.
  const strokeAllowance = 4;
  const borderDepth = border === 'none' ? 0 : insetMm + strokeAllowance;
  // The second line of a double border sits 4 mm further in; corner motifs
  // sit about 7 mm in and are roughly 3 mm across.
  const extra = border === 'double' ? 4 : 0;
  const cornerDepth = corners === 'none' ? 0 : insetMm + 10;

  return Math.max(borderDepth + extra, cornerDepth);
}

/**
 * The area of the blank the lettering may safely occupy, as an inset box.
 *
 * Two things pull it in. Curved shapes lose usable area near the edge, so an
 * oval gives up more than a rectangle. And a decorative border is a physical
 * groove in the board: text that crosses it looks like a mistake, because it
 * is one. Whichever of the two is the stricter wins.
 *
 * Because the size slider's ceiling is computed from this box, respecting the
 * border here is what actually stops a customer setting a size that would run
 * the lettering through their own frame.
 */
export function safeArea(
  shape: SignShape,
  w: number,
  h: number,
  /** From `decorationDepthMm`. Zero when the sign carries no decoration. */
  borderDepthMm = 0,
): { x: number; y: number; width: number; height: number } {
  const marginRatio = shape === 'oval' ? 0.14 : shape === 'arch' ? 0.1 : 0.07;
  const mx = Math.max(w * marginRatio, borderDepthMm);
  const my = Math.max(h * marginRatio, borderDepthMm);
  // An arch loses more at the top than the bottom.
  const topExtra = shape === 'arch' ? h * 0.08 : 0;

  // Never collapse to nothing on a small board with a deep border.
  const width = Math.max(w - mx * 2, w * 0.2);
  const height = Math.max(h - my * 2 - topExtra, h * 0.2);
  return { x: (w - width) / 2, y: (h - height - topExtra) / 2 + topExtra, width, height };
}

/**
 * Radius of the arc a bowed line of text sits on.
 *
 * Derived from the chord (the straight width the text would otherwise occupy)
 * and the sagitta — how far the middle of the arc departs from that chord.
 * `curvature` is the fraction of the maximum useful bend, which is capped at a
 * quarter of the chord; beyond that the text starts to curl back on itself.
 */
export function arcRadius(chordMm: number, curvature: number): number {
  const c = clamp(Math.abs(curvature), 0, 1);
  if (c < 0.001) return Infinity;
  const sagitta = (chordMm / 4) * c;
  return (chordMm * chordMm) / (8 * sagitta) + sagitta / 2;
}

/** The shallowest bend the arc wraps offer. Below it they are a straight line. */
export const MIN_CURVATURE = 0.05;

/**
 * The radius of an arc divided by its chord.
 *
 * Substituting the sagitta above into the radius gives r = chord ÷ 2c + chord·c
 * ÷ 8, so radius is simply proportional to chord for a fixed curvature. That
 * one fact is what lets every other figure on this page be solved in closed
 * form instead of searched for: how wide an arc may be for a given letter
 * height, and how tall a letter may be for a given arc.
 */
export function radiusPerChord(curvature: number): number {
  const c = clamp(Math.abs(curvature), MIN_CURVATURE, 1);
  return 1 / (2 * c) + c / 8;
}

/**
 * How far a descender drops below the baseline, as a fraction of cap height.
 *
 * A single figure for nine faces is a compromise, but it is the right kind:
 * it is only ever used to reserve room, and reserving a little too much costs
 * a millimetre of letter height, where reserving too little puts the tail of a
 * 'g' through the customer's border.
 */
const DESCENDER_RATIO = 0.26;

/**
 * How far the tallest marks reach above the capitals, as a fraction of cap
 * height.
 *
 * Cap height is the height of a plain capital, and almost nothing on a Swedish
 * sign is a plain capital: Å, Ä and Ö all carry a mark above the cap line, and
 * in most faces the lowercase ascender of a b or an l overshoots it too. Left
 * out of the reckoning, an arc of BJÖRKHAGA set to the largest size the slider
 * offered put the dots of the Ö through the carved border — the letters fitted
 * and the diacritics did not.
 */
const ACCENT_RATIO = 0.22;

/**
 * How much of the area a bowed line is allowed to span, end of letter to end
 * of letter. The remaining twelfth — four per cent either side — is the room a
 * bowed line has to move in when it is placed left or right rather than
 * centred. Without it the block is exactly as wide as the area it sits in, and
 * the horizontal half of the placement control silently does nothing.
 */
const ARC_SPAN = 0.92;

/**
 * The chord a bowed line of text may span.
 *
 * Letters on an upward bow ride the *outside* of the curve, so the ones at
 * either end lean out past the chord's own endpoints — by cap ÷ 2k each side,
 * where k is `radiusPerChord`. The harder the bend, the smaller k is and the
 * further they lean. Subtracting the lean from the span is what stops a large
 * letter at the end of an arc hanging over the edge of the board: chord plus
 * lean comes back to exactly the span, whatever the letter height.
 */
export function arcChordMm(
  availableWidthMm: number,
  capHeightMm: number,
  curvature: number,
): number {
  const span = availableWidthMm * ARC_SPAN;
  const lean = capHeightMm / radiusPerChord(curvature);
  return Math.max(span - lean, span * 0.35);
}

/** How far the middle of an arc departs from its chord, in millimetres. */
export function arcSagittaMm(chordMm: number, curvature: number): number {
  return (chordMm / 4) * clamp(Math.abs(curvature), 0, 1);
}

/** Length along a bowed baseline, which is always longer than its chord. */
export function arcLengthMm(chordMm: number, curvature: number): number {
  const r = arcRadius(chordMm, curvature);
  if (!Number.isFinite(r)) return chordMm;
  const half = Math.min(chordMm / 2 / r, 1);
  return 2 * r * Math.asin(half);
}

/**
 * An SVG path for one bowed line of text to sit on.
 *
 * The path is always drawn left to right so text reads the right way up. For
 * 'arcUp' the centre of the circle is below the text, which bows the line
 * upward; 'arcDown' puts it above.
 */
export function arcTextPath(
  wrap: Extract<TextWrap, 'arcUp' | 'arcDown'>,
  cx: number,
  cy: number,
  chordMm: number,
  curvature: number,
): string {
  const r = arcRadius(chordMm, curvature);
  if (!Number.isFinite(r)) {
    // Flat enough to be a straight line.
    return `M ${cx - chordMm / 2} ${cy} H ${cx + chordMm / 2}`;
  }

  const half = chordMm / 2;
  const sagitta = r - Math.sqrt(Math.max(r * r - half * half, 0));
  const up = wrap === 'arcUp';

  // Endpoints sit level with each other; the middle rises or falls by the sagitta.
  const y = up ? cy + sagitta / 2 : cy - sagitta / 2;
  // sweep 1 curves the path clockwise, which lifts its middle above the chord.
  const sweep = up ? 1 : 0;
  return `M ${cx - half} ${y} A ${r} ${r} 0 0 ${sweep} ${cx + half} ${y}`;
}

/**
 * A full circle for text to run around.
 *
 * Built from two half-arcs rather than one arc that returns to its own start.
 *
 * That distinction is not stylistic. An elliptical arc whose endpoints
 * coincide is degenerate by the SVG specification, and the near-coincident
 * version — ending a hair away from the start to dodge that rule — is treated
 * inconsistently: laying text along it put the lettering far below the board
 * instead of around the rim. Two unambiguous half-circles avoid the question
 * entirely and are what every drawing program emits.
 *
 * It starts at the bottom and runs clockwise, which puts the halfway point at
 * twelve o'clock. Centred text is placed at 50 % of a path's length, so this is
 * what makes a centred label sit squarely at the top — and because the path is
 * travelling left-to-right at that point, the letters read the right way up.
 */
export function circleTextPath(cx: number, cy: number, r: number): string {
  const radius = Math.max(r, 0.1);
  return [
    `M ${cx} ${cy + radius}`,
    // Bottom to top, passing the left side.
    `A ${radius} ${radius} 0 0 1 ${cx} ${cy - radius}`,
    // Top back to bottom, passing the right side.
    `A ${radius} ${radius} 0 0 1 ${cx} ${cy + radius}`,
  ].join(' ');
}

/**
 * Concentric radius for line `index` of a multi-line curved block.
 *
 * Lines nest inward for an upward arc and outward for a downward one, so the
 * block stays centred on the same circle rather than drifting.
 */
export function stackedRadius(baseRadius: number, index: number, lineStepMm: number, wrap: TextWrap): number {
  if (!Number.isFinite(baseRadius)) return baseRadius;
  const direction = wrap === 'arcDown' ? 1 : -1;
  return Math.max(baseRadius + direction * index * lineStepMm, lineStepMm);
}

/**
 * The room one block of text actually takes up, in millimetres.
 *
 * Returned relative to the block's own anchor — the point the renderer places
 * at the chosen position — because that is what both the renderer and the
 * constraint system need: one to keep the block inside the board, the other to
 * work out how large it is allowed to get.
 *
 * The three wraps occupy space in genuinely different ways, and that is the
 * whole reason this exists. A straight line is its own height. A bowed line is
 * its sagitta *plus* its letters, because the letters stand off the curve. A
 * ring of text is its radius plus its letters in every direction at once — a
 * 78 mm circle of 40 mm capitals needs 236 mm of board, not 156 mm.
 */
export interface BlockBox {
  /** Half the block's width. */
  halfWidth: number;
  /** How far it reaches above the anchor. */
  up: number;
  /** How far it reaches below. */
  down: number;
}

export function blockBox(params: {
  wrap: TextWrap;
  capHeightMm: number;
  /** Line spacing as a multiple of cap height. */
  lineHeight: number;
  lineCount: number;
  curvature: number;
  circleRadiusMm: number;
  /** Width of the area the block is being fitted into. */
  availableWidthMm: number;
  /** Measured straight-line width of the widest line. Omit if unmeasured. */
  measuredWidthMm?: number;
}): BlockBox {
  const {
    wrap,
    capHeightMm: cap,
    lineHeight,
    curvature,
    circleRadiusMm,
    availableWidthMm,
    measuredWidthMm,
  } = params;
  const lines = Math.max(params.lineCount, 1);
  const step = cap * lineHeight;
  const descender = cap * DESCENDER_RATIO;

  if (wrap === 'circle') {
    // Letters sit outside the ring the whole way round, so the block is the
    // same size in every direction.
    const reach = circleRadiusMm + cap * (1 + ACCENT_RATIO);
    return { halfWidth: reach, up: reach, down: reach };
  }

  if (wrap === 'arcUp' || wrap === 'arcDown') {
    const chord = arcChordMm(availableWidthMm, cap, curvature);
    const sagitta = arcSagittaMm(chord, curvature);
    // Successive lines are nudged along the block's own axis either way from
    // the anchor, so a two-line arc is one line step taller in both directions.
    const stack = ((lines - 1) * step) / 2;
    return {
      halfWidth: chord / 2 + cap / (2 * radiusPerChord(curvature)),
      up: sagitta / 2 + cap * (1 + ACCENT_RATIO) + stack,
      down: sagitta / 2 + descender + stack,
    };
  }

  const height = (lines - 1) * step + cap;
  return {
    halfWidth: (measuredWidthMm ?? availableWidthMm) / 2,
    up: height / 2 + cap * ACCENT_RATIO,
    down: height / 2 + descender,
  };
}

/**
 * The tallest letters that still leave the whole block inside an area.
 *
 * Each wrap is solved on its own terms rather than through one fudged margin:
 *
 *  - A straight block is its line stack plus a descender.
 *  - A ring is its radius plus its letters, so the room left for letters is
 *    half the shorter side of the area minus the radius.
 *  - A bow is the awkward one, because widening the letters narrows the chord
 *    they sit on, which shortens the sagitta, which frees height again. Since
 *    radius is proportional to chord (see `radiusPerChord`), that circularity
 *    collapses into one linear equation, solved here directly.
 */
export function maxCapHeightMm(params: {
  wrap: TextWrap;
  lineHeight: number;
  lineCount: number;
  curvature: number;
  circleRadiusMm: number;
  areaWidthMm: number;
  areaHeightMm: number;
}): number {
  const { wrap, lineHeight, curvature, circleRadiusMm, areaWidthMm: w, areaHeightMm: h } = params;
  const lines = Math.max(params.lineCount, 1);
  const stack = (lines - 1) * lineHeight;

  if (wrap === 'circle') {
    return (Math.min(w, h) / 2 - circleRadiusMm) / (1 + ACCENT_RATIO);
  }

  if (wrap === 'arcUp' || wrap === 'arcDown') {
    const c = clamp(Math.abs(curvature), MIN_CURVATURE, 1);
    const k = radiusPerChord(c);
    const span = w * ARC_SPAN;
    // Vertical room: sagitta + cap + descender + the line stack must fit, with
    // the sagitta itself shrinking as the cap grows.
    const denominator = 1 + ACCENT_RATIO + DESCENDER_RATIO + stack - c / (4 * k);
    const fromHeight = (h - (span * c) / 4) / denominator;
    // Horizontal room: the chord may not be squeezed past its own floor by the
    // letters leaning off the ends of it.
    const fromLean = k * span * 0.65;
    return Math.min(fromHeight, fromLean);
  }

  return h / (stack + 1 + ACCENT_RATIO + DESCENDER_RATIO);
}

/**
 * The hardest bend a line may take and still fit the area.
 *
 * Walked down from the maximum a hundredth at a time rather than solved.
 * Curvature enters the height equation through the sagitta *and* through the
 * lean that sets the chord, and while the result is monotonic across every
 * shape a customer can reach, proving that for every shape they cannot is not
 * worth a closed form: the slider has a hundred stops and this checks them.
 */
export function maxCurvature(params: {
  capHeightMm: number;
  lineHeight: number;
  lineCount: number;
  areaWidthMm: number;
  areaHeightMm: number;
}): number {
  const { capHeightMm: cap, lineHeight, areaWidthMm: w, areaHeightMm: h } = params;
  const lines = Math.max(params.lineCount, 1);
  const stack = (lines - 1) * cap * lineHeight;

  for (let c = 1; c > MIN_CURVATURE; c -= 0.01) {
    const chord = arcChordMm(w, cap, c);
    const total = arcSagittaMm(chord, c) + cap * (1 + ACCENT_RATIO + DESCENDER_RATIO) + stack;
    if (total <= h) return Math.round(c * 100) / 100;
  }
  return MIN_CURVATURE;
}

/** The widest ring of text that still fits, given how tall its letters are. */
export function maxCircleRadiusMm(params: {
  capHeightMm: number;
  areaWidthMm: number;
  areaHeightMm: number;
}): number {
  return (
    Math.min(params.areaWidthMm, params.areaHeightMm) / 2 -
    params.capHeightMm * (1 + ACCENT_RATIO)
  );
}

/**
 * How much baseline a block has to write along.
 *
 * A straight line gets the width of the area. A bow gets the length of the
 * curve, which is longer than the chord beneath it. A ring gets four fifths of
 * its circumference: the missing fifth is the gap at the bottom, without which
 * the last letter arrives back at the first and the word closes on itself.
 */
export function baselineLengthMm(params: {
  wrap: TextWrap;
  capHeightMm: number;
  curvature: number;
  circleRadiusMm: number;
  areaWidthMm: number;
}): number {
  const { wrap, capHeightMm, curvature, circleRadiusMm, areaWidthMm } = params;
  if (wrap === 'circle') return 2 * Math.PI * circleRadiusMm * 0.8;
  if (wrap === 'arcUp' || wrap === 'arcDown') {
    return arcLengthMm(arcChordMm(areaWidthMm, capHeightMm, curvature), curvature) * 0.98;
  }
  return areaWidthMm;
}

/**
 * Places a block inside an area so that none of it falls outside.
 *
 * `fraction` is where the customer asked for it, 0…1 across the area. When the
 * block fits, that is exactly where it goes. When it does not — a ring of text
 * asked to sit at the top of a short board — it is held against the nearest
 * edge rather than allowed off the end, which is the same bargain the rest of
 * the designer makes: the control still moves, it just cannot produce a sign
 * that could not be cut.
 */
export function anchorWithin(
  start: number,
  size: number,
  fraction: number,
  before: number,
  after: number,
): number {
  const wanted = start + fraction * size;
  const low = start + before;
  const high = start + size - after;
  // Bigger than the area it is being fitted into: centre it and let the size
  // constraints bring it back.
  if (low > high) return start + size / 2 + (before - after) / 2;
  return clamp(wanted, low, high);
}

/** Splits a text block into its lines, dropping trailing blank lines. */
export function toLines(content: string): string[] {
  const lines = content.split('\n');
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Snaps to a step, used by the size controls so dimensions stay buildable. */
export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Face area of the blank in dm², which is the unit material is priced in. */
export function faceAreaDm2(shape: SignShape, w: number, h: number): number {
  const rectangleDm2 = (w * h) / 10000;
  // Shapes cut from a rectangular blank still consume the whole rectangle, so
  // material is charged on the rectangle. The fraction below is only used where
  // actual carved surface matters, such as clearing a raised background.
  return rectangleDm2;
}

/** Fraction of the enclosing rectangle the finished shape actually covers. */
export function shapeCoverage(shape: SignShape): number {
  switch (shape) {
    case 'rect':
      return 1;
    case 'rounded':
      return 0.985;
    case 'arch':
      return 0.93;
    case 'oval':
      return Math.PI / 4;
  }
}
