import type { SignShape, TextWrap } from './types';

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
 * The area of the blank the lettering may safely occupy, as an inset box.
 *
 * Curved shapes lose usable area near the edge, so they get a deeper inset.
 * This is what the overflow warning measures against.
 */
export function safeArea(
  shape: SignShape,
  w: number,
  h: number,
): { x: number; y: number; width: number; height: number } {
  const marginRatio = shape === 'oval' ? 0.14 : shape === 'arch' ? 0.1 : 0.07;
  const mx = w * marginRatio;
  const my = h * marginRatio;
  // An arch loses more at the top than the bottom.
  const topExtra = shape === 'arch' ? h * 0.08 : 0;
  return { x: mx, y: my + topExtra, width: w - mx * 2, height: h - my * 2 - topExtra };
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
 * It starts at the bottom and runs clockwise, which puts the halfway point at
 * twelve o'clock. Centred text is placed at 50 % of a path's length, so this is
 * what makes a centred label sit squarely at the top — and because the path is
 * travelling left-to-right at that point, the letters read the right way up.
 */
export function circleTextPath(cx: number, cy: number, r: number): string {
  return [
    `M ${cx} ${cy + r}`,
    `A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy + r}`,
    'Z',
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
