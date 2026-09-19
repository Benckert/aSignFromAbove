'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { getFont } from '@/config/carving-fonts';
import type { TextBlock } from '@/lib/sign/model';
import type { BlockBox } from '@/lib/sign/store';
import { isBlank, toLines } from '@/lib/sign/text';

/**
 * One block of lettering, set by the browser.
 *
 * This used to be a glyph outline generated from a font file parsed in the
 * browser, on the argument that the outline was the shape the router would cut.
 * It is not — the preview is an impression for the customer and the toolpath is
 * a separate job — so the argument was paying for something nobody had asked
 * for, and the price was steep: a hand-written layout, a font parser and 860 KB
 * of vendored TrueType on the client, a face the parser's shaper crashed on,
 * and a serialiser that emitted the literal text NaN for any coordinate landing
 * within a millionth of a whole number, which silently deleted letters at some
 * sizes and not others.
 *
 * An `<svg:text>` has none of those problems, because the thing rendering it is
 * the most heavily tested text engine on the machine. Shaping, kerning,
 * ligatures, diacritics: all of it, correct, free.
 *
 * ── Three things worth knowing ────────────────────────────────────────────
 *
 * Cap height. A sign is specified in millimetres of capital and SVG sets type
 * by em, so the conversion needs each face's cap-to-em ratio. Those are in the
 * catalogue, read out of the font files rather than estimated — they were
 * estimated once, and Dancing Script was out by a quarter.
 *
 * Position. `dominantBaseline` puts a line's middle on its own y, so a stack of
 * baselines is centred about the anchor with nothing measured. That is what
 * lets the server draw this correctly and the browser agree on the first paint.
 *
 * The anchor. Which is the block's position, less however far the glyphs sit
 * off it. Usually nothing, but a browser reports the union of the font's box
 * and the ink, and ink escapes the font box when a ring sits over an Å — which
 * is to say on most Swedish signs.
 */

/** useLayoutEffect on a browser, useEffect where there is no layout to read. */
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function BlockText({
  block,
  box,
  fill,
  filter,
  /**
   * Given when whoever is drawing this wants to know how big it came out.
   * Left off by the places that only want a picture, such as the front page.
   */
  onMeasure,
}: {
  block: TextBlock;
  box?: BlockBox;
  fill: string;
  filter?: string;
  onMeasure?: (id: string, box: BlockBox | null) => void;
}) {
  const node = useRef<SVGTextElement | null>(null);
  const face = getFont(block.fontId);
  const blank = isBlank(block.text);

  /*
    Where to hang the text so that its box comes out centred on the block's
    position. Zero until the first measurement, and after that a fixed property
    of these glyphs at this size — so correcting for it does not move what is
    being measured, and one pass settles it.
  */
  const anchorXMm = block.xMm - (box?.offsetXMm ?? 0);
  const anchorYMm = block.yMm - (box?.offsetYMm ?? 0);

  /*
    Measured after every render, with no dependency list, because every input to
    the layout is a reason to re-measure: the words, the face, the size, the
    tracking, the line spacing, the number of lines. Listing them would be a
    second copy of what the render already depends on, and the first thing to
    fall out of step. One getBBox on one element is cheap, and the store ignores
    a measurement that has not changed, so this settles rather than loops.
  */
  useMeasureEffect(() => {
    if (!onMeasure) return;
    const element = node.current;
    if (!element || blank) {
      onMeasure(block.id, null);
      return;
    }
    let measured: DOMRect;
    try {
      // Throws in some engines when the element is not being rendered; an
      // unmeasurable block should keep its last good size, not lose it.
      measured = element.getBBox();
    } catch {
      return;
    }
    if (!(measured.width > 0) || !(measured.height > 0)) {
      onMeasure(block.id, null);
      return;
    }
    onMeasure(block.id, {
      widthMm: measured.width,
      heightMm: measured.height,
      // React hands an effect the props of the render it belongs to, so this is
      // the size the text on screen was actually set at.
      capMm: block.capHeightMm,
      offsetXMm: measured.x + measured.width / 2 - anchorXMm,
      offsetYMm: measured.y + measured.height / 2 - anchorYMm,
    });
  });

  if (blank) return null;

  const lines = toLines(block.text);
  const content = face.capsOnly ? lines.map((line) => line.toUpperCase()) : lines;
  const fontSize = block.capHeightMm / face.capRatio;
  const lineStep = block.capHeightMm * block.lineSpacing;

  /*
    Left and right alignment need the block's width, because the anchor moves to
    its edge — and until the first measurement there is no width, so everything
    is centred. That is deliberate: the server and the browser's first render
    agree on it, and the correction arrives in a layout effect before anything
    is painted.
  */
  const known = box?.widthMm;
  const anchor =
    known === undefined || block.align === 'center'
      ? 'middle'
      : block.align === 'left'
        ? 'start'
        : 'end';
  const x =
    known === undefined || block.align === 'center'
      ? anchorXMm
      : block.align === 'left'
        ? anchorXMm - known / 2
        : anchorXMm + known / 2;

  return (
    <text
      ref={node}
      x={x}
      y={anchorYMm}
      textAnchor={anchor}
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
          // is centred on its position rather than hanging below it.
          dy={index === 0 ? (-(content.length - 1) * lineStep) / 2 : lineStep}
        >
          {/* A blank line still has to occupy its own line. */}
          {line === '' ? ' ' : line}
        </tspan>
      ))}
    </text>
  );
}
