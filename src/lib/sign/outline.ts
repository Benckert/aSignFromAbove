import { Path, type Font } from 'opentype.js';

/**
 * Lettering as real outlines.
 *
 * This module replaces a tower of estimates. The previous designer worked from
 * a table of cap-height ratios, corrected it with a canvas measurement at
 * runtime, then reserved 26 % of the cap height for descenders and 22 % above
 * it for the dots on an Ö, and added a further allowance for the way letters
 * lean off the end of an arc. Each of those numbers was a reasonable guess, and
 * every sizing bug in the project came from one of them being wrong for a
 * particular face or a particular word.
 *
 * None of them are needed. The font file states exactly where the ink of a
 * given string lands, and asking it costs a few milliseconds once per face.
 * SJÖSTUGAN gets room for its accents; SJOSTUGAN does not have to reserve any.
 *
 * The outline is also the thing the workshop cuts, so what the customer sees on
 * screen and what goes on the machine are one object rather than two
 * approximations of each other.
 *
 * ── Conventions ────────────────────────────────────────────────────────────
 * Everything here is in millimetres on the finished board, matching the
 * preview's viewBox. Paths come back with the first baseline at y = 0 and the
 * line starting at x = 0; y increases downward as it does everywhere in SVG,
 * so ink above the baseline has negative y. Callers place a block by
 * translating it, never by scaling it.
 */

export interface TextBox {
  /** Left edge of the ink, in mm, relative to the block's own origin. */
  x: number;
  /** Top edge of the ink. Negative, since ink sits above the first baseline. */
  y: number;
  width: number;
  height: number;
}

export interface Outline {
  /** SVG path data for the whole block. */
  d: string;
  /** Exactly where the ink is. Not the em box, and not a guess. */
  box: TextBox;
}

export interface LineRequest {
  /** May contain newlines; each becomes its own baseline. */
  text: string;
  /** Height of a capital letter on the finished board, in mm. */
  capHeightMm: number;
  /** Extra tracking between letters, as a fraction of the em. */
  trackingEm: number;
  /** Distance between baselines, as a multiple of cap height. */
  lineSpacing: number;
  align: 'left' | 'center' | 'right';
}

/**
 * The height of a capital as a fraction of the em, read from the face itself.
 *
 * Taken from the outline of an H rather than from the OS/2 table's declared
 * capHeight, because a number in a table is what the designer intended and the
 * outline is what the machine will cut. The two usually agree; when they do
 * not, the outline is the one that is true.
 */
export function capRatio(font: Font): number {
  const h = font.charToGlyph('H').getBoundingBox();
  const ratio = h.y2 / font.unitsPerEm;
  // A face with no H, or a broken one, would otherwise divide by zero
  // downstream and take the whole preview with it.
  return ratio > 0.4 && ratio < 1 ? ratio : 0.7;
}

/** Splits a block into lines, dropping trailing blank ones. */
export function toLines(text: string): string[] {
  const lines = text.split('\n');
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

/**
 * Lays out one line, left to right from x = 0, baseline on y = 0.
 *
 * Composed a glyph at a time rather than through `font.getPath`, for three
 * reasons. It is the only way to apply tracking, which a sign needs far more
 * than a paragraph does. It gives per-glyph positions, which is what laying
 * text along an arc will need. And opentype's own shaping engine throws on
 * several of these faces — Merriweather among them — over a substitution
 * format it has not implemented, which would have taken a third of the
 * catalogue out of the picker for a feature no sign uses.
 *
 * Kerning is applied by hand from the face's own pairs, so "AV" still closes up.
 */
function layoutLine(
  font: Font,
  text: string,
  fontSizeMm: number,
  trackingMm: number,
): { path: Path; advance: number } {
  const path = new Path();
  const scale = fontSizeMm / font.unitsPerEm;
  let pen = 0;
  let previous = null;

  for (const character of [...text]) {
    const glyph = font.charToGlyph(character);
    if (previous) pen += font.getKerningValue(previous, glyph) * scale;
    path.extend(glyph.getPath(pen, 0, fontSizeMm));
    pen += glyph.advanceWidth * scale + trackingMm;
    previous = glyph;
  }

  // The trailing character contributes no tracking: there is nothing after it.
  return { path, advance: Math.max(pen - trackingMm, 0) };
}

/**
 * Turns a block of text into one outline and its exact bounds.
 *
 * Returns null when there is nothing to draw, so a caller can distinguish "no
 * text" from "text that happens to occupy no space".
 */
export function outlineBlock(font: Font, request: LineRequest): Outline | null {
  const { capHeightMm, trackingEm, lineSpacing, align } = request;
  const lines = toLines(request.text);
  if (lines.every((line) => line.trim() === '')) return null;

  const fontSizeMm = capHeightMm / capRatio(font);
  const trackingMm = trackingEm * fontSizeMm;
  const step = capHeightMm * lineSpacing;

  const laid = lines.map((line) => layoutLine(font, line, fontSizeMm, trackingMm));
  const widest = Math.max(...laid.map((l) => l.advance));

  const block = new Path();
  laid.forEach(({ path, advance }, index) => {
    const offsetX = align === 'left' ? 0 : align === 'right' ? widest - advance : (widest - advance) / 2;
    const offsetY = index * step;
    if (offsetX !== 0 || offsetY !== 0) translate(path, offsetX, offsetY);
    block.extend(path);
  });

  const b = block.getBoundingBox();
  return {
    d: block.toPathData(2),
    box: { x: b.x1, y: b.y1, width: b.x2 - b.x1, height: b.y2 - b.y1 },
  };
}

/**
 * Shifts a path in place.
 *
 * opentype.js has no transform of its own, and a path is a plain list of
 * commands whose coordinate fields are named by position on the curve, so
 * moving one is a matter of walking the three pairs each command can carry.
 */
function translate(path: Path, dx: number, dy: number): void {
  const commands = (path as unknown as { commands: Record<string, number>[] }).commands;
  for (const command of commands) {
    for (const [x, y] of [
      ['x', 'y'],
      ['x1', 'y1'],
      ['x2', 'y2'],
    ]) {
      if (typeof command[x] === 'number') command[x] += dx;
      if (typeof command[y] === 'number') command[y] += dy;
    }
  }
}
