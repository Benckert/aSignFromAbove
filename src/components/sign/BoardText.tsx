'use client';

import { getFont } from '@/config/carving-fonts';
import type { TextBlock } from '@/lib/sign/draft';

/**
 * The lettering, set by the browser.
 *
 * This used to be a glyph outline generated with opentype.js, on the argument
 * that the outline was the shape the router would cut. It is not — the preview
 * is an impression for the customer, and the toolpath is a separate job for
 * later — so the argument was paying for something nobody had asked for, and
 * the price was steep: a hand-written layout, a font parser and 860 KB of
 * vendored TrueType in the browser, a face the parser's shaper crashed on, and
 * a serialiser that emitted the literal text NaN for any coordinate landing
 * within a millionth of a whole number, which silently deleted letters at some
 * sizes and not others.
 *
 * An `<svg:text>` has none of those problems, because the thing rendering it is
 * the most heavily tested text engine on the machine. Shaping, kerning,
 * ligatures, diacritics, hinting: all of it, correct, free.
 *
 * ── Two things worth knowing ───────────────────────────────────────────────
 *
 * Cap height. A sign is specified in millimetres of capital, and SVG sets type
 * by em, so the conversion needs each face's cap-to-em ratio. Those are in the
 * catalogue, read out of the font files themselves rather than estimated —
 * `scripts/measure-faces.mjs` reproduces them.
 *
 * Position. `dominantBaseline` puts a line's middle on its own y, so a stack of
 * baselines is centred about the anchor without anything having to be measured
 * — which is what lets the server draw this correctly, and the browser agree
 * with it on the first paint. The anchor is the block's position until a
 * measurement says the glyphs sit slightly off it, and then it is the position
 * less that. Measurement is for the selection frame, the snapping and that
 * correction, and all of it happens afterwards.
 */

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

export function BoardText({
  block,
  anchorXMm,
  anchorYMm,
  fill,
  filter,
  textRef,
  /** Measured width, once there is one. Only alignment needs it. */
  widthMm,
}: {
  block: TextBlock;
  /**
   * Where to hang the text, which is where the block sits less whatever the
   * last measurement said the glyphs do on their own. The board works it out,
   * because the board is what holds the measurement.
   */
  anchorXMm: number;
  anchorYMm: number;
  fill: string;
  filter?: string;
  textRef?: React.Ref<SVGTextElement>;
  widthMm?: number;
}) {
  const face = getFont(block.fontId);
  if (isBlank(block.text)) return null;
  const lines = toLines(block.text);

  const content = face.capsOnly ? lines.map((line) => line.toUpperCase()) : lines;
  const fontSize = block.capHeightMm / face.capRatio;
  const lineStep = block.capHeightMm * block.lineSpacing;

  /*
    Left and right alignment need the block's width, because the anchor moves
    to its edge — and until the first measurement lands there is no width, so
    everything is centred. That is deliberate: the server and the browser's
    first render agree on it, and the correction arrives in a layout effect
    before anything is painted.
  */
  const anchor = block.align === 'left' ? 'start' : block.align === 'right' ? 'end' : 'middle';
  const x =
    widthMm === undefined || block.align === 'center'
      ? anchorXMm
      : block.align === 'left'
        ? anchorXMm - widthMm / 2
        : anchorXMm + widthMm / 2;

  return (
    <text
      ref={textRef}
      x={x}
      y={anchorYMm}
      textAnchor={widthMm === undefined ? 'middle' : anchor}
      dominantBaseline="central"
      fontFamily={face.cssFamily}
      fontSize={fontSize}
      letterSpacing={block.trackingEm * fontSize}
      fill={fill}
      filter={filter}
      aria-hidden="true"
      style={{ whiteSpace: 'pre' }}
    >
      {content.map((line, index) => (
        <tspan
          key={index}
          x={x}
          // The first line is lifted by half the stack, so the block as a whole
          // is centred on the position rather than hanging below it.
          dy={index === 0 ? (-(content.length - 1) * lineStep) / 2 : lineStep}
        >
          {/* A blank line still has to occupy its own line. */}
          {line === '' ? ' ' : line}
        </tspan>
      ))}
    </text>
  );
}
