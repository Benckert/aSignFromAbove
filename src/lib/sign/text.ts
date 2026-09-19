import { getFont } from '@/config/carving-fonts';

/**
 * What counts as a line, and how small a letter may be.
 *
 * Here rather than beside the component that draws the words, because the rule
 * about the smallest cuttable letter is also the rule that decides whether a
 * name will go on a board at all — and that question is asked by the controls,
 * by the measurement, and by the thing that stops a customer typing a sign
 * which cannot be made.
 */

/** Smallest letters offered, whatever the face says. */
export const MIN_CAP_MM = 8;

/** The finest cutter in the workshop, in millimetres. */
const FINEST_BIT_MM = 0.8;

/** Whether there is anything to carve. */
export function isBlank(text: string): boolean {
  return text.trim() === '';
}

/** Splits a block into lines, dropping trailing blank ones. */
export function toLines(text: string): string[] {
  const lines = text.split('\n');
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

/**
 * The smallest capital this face can be cut at.
 *
 * A face's narrowest stroke is a fraction of its cap height, and the bit has to
 * fit inside it. Playfair's hairlines are a twenty-second of its capital, so it
 * needs an eighteen-millimetre letter before the finest cutter can enter them;
 * Alfa Slab's strokes are a fifth, and it would go down to four, which is below
 * anything worth carving.
 *
 * The stroke ratios are read off the outlines rather than measured from a
 * production toolpath, so this is advisory — a millimetre out costs a slightly
 * conservative floor, not a sign that cannot be cut.
 */
export function minCapMm(fontId: string): number {
  return Math.max(MIN_CAP_MM, Math.ceil(FINEST_BIT_MM / getFont(fontId).strokeRatio));
}
