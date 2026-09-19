import { BORDER_GAP_MM, borderInsetMm, type Sign, type SignShape } from './model';

/**
 * The shapes of a sign, in millimetres.
 *
 * What is left of a file that ran to five hundred lines. The rest of it existed
 * to *estimate* things about set type — how wide a word would be, how far an
 * accent rose above a capital, how much a bowed baseline lengthened — because
 * the preview drew glyph outlines it had composed itself and nothing else knew
 * the answers. The browser lays the type out now and is asked directly, so the
 * estimates are not merely unnecessary, they were a second opinion that could
 * disagree with the drawing. Two of them did, and both disagreements reached a
 * customer as lettering hanging off the edge of the wood.
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
      return [`M 0 ${rise}`, `A ${radius} ${radius} 0 0 1 ${w} ${rise}`, `V ${h}`, 'H 0', 'Z'].join(
        ' ',
      );
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

export interface BorderLine {
  d: string;
  /** Millimetres to shift the path by, so it sits concentric with the board. */
  offsetMm: number;
  /** Groove width, in millimetres. */
  widthMm: number;
}

/**
 * The lines of a carved border, following the outline of the board.
 *
 * A border on an arched sign curves over the top the way a carved one would,
 * so these are the board's own outline drawn at a smaller size rather than a
 * rectangle sitting inside it.
 *
 * Drawn at a smaller size and shifted, specifically — not scaled. Scaling the
 * board's path about its centre is one transform instead of two, and it is what
 * this used to do, but a non-uniform scale takes the stroke with it: on a
 * 400 × 220 board the groove came out some seven per cent narrower across than
 * it was down. A groove is a groove; the cutter does not know which way it is
 * travelling.
 */
export function borderLines(sign: Sign): BorderLine[] {
  if (sign.border === 'none') return [];

  const line = (inset: number, widthMm: number): BorderLine | null => {
    const w = sign.widthMm - inset * 2;
    const h = sign.heightMm - inset * 2;
    if (w <= 0 || h <= 0) return null;
    return { d: signOutlinePath(sign.shape, w, h), offsetMm: inset, widthMm };
  };

  const inset = borderInsetMm(sign);
  const lines =
    sign.border === 'line'
      ? [line(inset, 2)]
      : // The outer line is the heavier of the two, which is what makes the
        // pair read as one frame rather than as two competing ones.
        [line(inset, 2.2), line(inset + BORDER_GAP_MM, 1)];

  return lines.filter((l): l is BorderLine => l !== null);
}

/** Total length of the border grooves, in millimetres. Feeds the price. */
export function borderPathLengthMm(sign: Sign): number {
  if (sign.border === 'none') return 0;
  const inset = borderInsetMm(sign);
  const perimeter = (i: number) =>
    2 * (Math.max(sign.widthMm - i * 2, 0) + Math.max(sign.heightMm - i * 2, 0));
  return sign.border === 'line'
    ? perimeter(inset)
    : perimeter(inset) + perimeter(inset + BORDER_GAP_MM);
}

/**
 * How much of its bounding rectangle each shape actually covers.
 *
 * Used to price the background clearing on a raised carve, where the cost
 * tracks board area rather than how much text there is.
 */
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

/** Snaps to a step, used by the size controls so dimensions stay buildable. */
export function snapTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
