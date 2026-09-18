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
    d: toPathData(block, 3),
    box: { x: b.x1, y: b.y1, width: b.x2 - b.x1, height: b.y2 - b.y1 },
  };
}

/**
 * Writes a path out as SVG path data.
 *
 * opentype.js has a `toPathData` of its own and this does not use it, for a
 * reason worth recording rather than a preference. Its number formatter rounds
 * by building a string:
 *
 *     +(Math.round(decimalPart + 'e+' + places) + 'e-' + places)
 *
 * which works until `decimalPart` is small enough that JavaScript prints it in
 * exponential form — anything under 1e-6. Then the concatenation reads
 * "7.1054e-15e+2", which is not a number, and the coordinate comes out as the
 * literal text NaN in the middle of the path. Any coordinate landing a hair
 * above a whole millimetre hits it, so whether a sign renders depends on
 * whether the arithmetic at that particular size happens to produce one:
 * BLALSLE in Cinzel lost four letters at 48 mm, six at 50 mm, and was perfect
 * at 51 mm. The sweep in outline.test.ts is there to make sure nothing of the
 * sort can return unnoticed.
 *
 * Closing each contour is the other difference. `Glyph.getPath` drops every Z
 * unless the path is being stroked, which fill hides and a cutting path would
 * not: a glyph outline is a set of closed contours, and it should say so.
 */
export function toPathData(path: Path, decimals: number): string {
  const parts: string[] = [];
  let open = false;

  const n = (value: number) => {
    const rounded = Number(value.toFixed(decimals));
    // Negative zero is valid in SVG and noise in a diff.
    return Object.is(rounded, -0) ? '0' : String(rounded);
  };

  for (const command of (path as unknown as { commands: PathCommand[] }).commands) {
    switch (command.type) {
      case 'M':
        if (open) parts.push('Z');
        open = true;
        parts.push(`M${n(command.x!)} ${n(command.y!)}`);
        break;
      case 'L':
        parts.push(`L${n(command.x!)} ${n(command.y!)}`);
        break;
      case 'Q':
        parts.push(`Q${n(command.x1!)} ${n(command.y1!)} ${n(command.x!)} ${n(command.y!)}`);
        break;
      case 'C':
        parts.push(
          `C${n(command.x1!)} ${n(command.y1!)} ${n(command.x2!)} ${n(command.y2!)}` +
            ` ${n(command.x!)} ${n(command.y!)}`,
        );
        break;
      case 'Z':
        parts.push('Z');
        open = false;
        break;
    }
  }
  if (open) parts.push('Z');
  return parts.join('');
}

interface PathCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
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
