'use client';

import { useId } from 'react';
import { getFont } from '@/config/carving-fonts';
import type { TextBlock } from '@/lib/designer/types';
import type { BlockBox } from '@/lib/designer/geometry';
import {
  anchorWithin,
  arcChordMm,
  arcRadius,
  arcTextPath,
  blockBox,
  circleTextPath,
  stackedRadius,
  toLines,
} from '@/lib/designer/geometry';
import { fontSizeForCapHeight } from '@/lib/designer/measure';

/**
 * Lays out one text block on the board.
 *
 * Straight lines are ordinary <text> with a tspan per line, which keeps
 * alignment and spacing under the browser's own control. Curved lines cannot
 * use that, so each line gets its own <path> and rides it with <textPath>.
 *
 * Positions are given in millimetres, matching the viewBox, so a value here is
 * a measurement on the finished board.
 */

interface Props {
  block: TextBlock;
  /** The area the text is allowed to occupy, in mm. */
  area: { x: number; y: number; width: number; height: number };
  capRatios: Record<string, number>;
  fill: string;
  filter?: string;
  /** Draws a faint box round the block, to show what is being edited. */
  selected?: boolean;
}

export function SignText({ block, area, capRatios, fill, filter, selected }: Props) {
  /*
    Path ids come from React's own useId rather than from the block's id.

    Block ids are generated with Math.random when a line is created, which is
    fine for a React key but produces a different value on the server than in
    the browser. Any curved line puts that id into the DOM twice — once on the
    <path> and once in the <textPath href> — so the two renders disagreed and
    React reported a hydration mismatch. useId is stable across both.
  */
  const pathId = useId().replace(/:/g, '');
  const font = getFont(block.fontId);
  const lines = toLines(block.content);
  if (lines.every((l) => !l.trim())) return null;

  const content = font.capsOnly ? lines.map((l) => l.toUpperCase()) : lines;
  const fontSize = fontSizeForCapHeight(block.fontId, block.capHeightMm, capRatios);
  const lineStep = block.capHeightMm * block.lineHeight;

  /*
    Where the block goes, in board millimetres.

    The chosen position moves the block's *box*, not an abstract centre point.
    A ring of text is its radius plus its letters across, so asking for it at
    the top of the board and getting its centre there put two thirds of the
    word off the edge. Anchoring the box means the top of the grid puts the top
    of the lettering against the top of the safe area, which is what anyone
    clicking that cell meant.
  */
  const box = blockBox({
    wrap: block.wrap,
    capHeightMm: block.capHeightMm,
    lineHeight: block.lineHeight,
    lineCount: content.length,
    curvature: block.curvature,
    circleRadiusMm: block.circleRadiusMm,
    availableWidthMm: area.width,
  });

  /*
    Curved blocks are held inside the area on both axes. A straight one is not
    held horizontally, because nothing here has measured its glyphs — that
    happens in the controls, where there is a canvas — and clamping against a
    guessed width would drag every centred line to the middle of the board.
    Its ceiling comes from the measured width instead, in `capHeightRange`.
  */
  const cx =
    block.wrap === 'straight'
      ? area.x + block.x * area.width
      : anchorWithin(area.x, area.width, block.x, box.halfWidth, box.halfWidth);
  const cy = anchorWithin(area.y, area.height, block.y, box.up, box.down);

  const shared = {
    fontFamily: font.cssFamily,
    fontSize,
    letterSpacing: `${block.letterSpacing * fontSize}`,
    fill,
    filter,
  } as const;

  /* ── Curved: one path per line ────────────────────────────────────────── */
  if (block.wrap !== 'straight') {
    const isCircle = block.wrap === 'circle';
    const chord = arcChordMm(area.width, block.capHeightMm, block.curvature);
    const baseRadius = isCircle ? block.circleRadiusMm : arcRadius(chord, block.curvature);

    return (
      <g aria-hidden="true">
        {selected && <SelectionBox cx={cx} cy={cy} box={box} />}
        <defs>
          {content.map((_, i) => {
            const radius = stackedRadius(baseRadius, i, lineStep, block.wrap);
            const d = isCircle
              ? circleTextPath(cx, cy, Math.max(radius, 1))
              : arcTextPath(
                  block.wrap as 'arcUp' | 'arcDown',
                  cx,
                  // Nudge each successive line down the block.
                  cy + (i - (content.length - 1) / 2) * lineStep,
                  chord,
                  block.curvature,
                );
            return <path key={i} id={`${pathId}-l${i}`} d={d} />;
          })}
        </defs>
        {content.map((line, i) => (
          <text key={i} {...shared} textAnchor="middle">
            {/* startOffset 50 % with a centred anchor places the line's middle
                at the halfway point of its path — the top of a circle, or the
                crown of an arc. */}
            <textPath href={`#${pathId}-l${i}`} startOffset="50%">
              {line}
            </textPath>
          </text>
        ))}
      </g>
    );
  }

  /* ── Straight ─────────────────────────────────────────────────────────── */

  // Vertical centring: the block's own height is the stack of line steps plus
  // one cap height, and `cy` is its middle.
  const blockHeight = (content.length - 1) * lineStep + block.capHeightMm;
  const firstBaseline = cy - blockHeight / 2 + block.capHeightMm;

  const anchor = block.align === 'left' ? 'start' : block.align === 'right' ? 'end' : 'middle';
  const x = block.align === 'left' ? area.x : block.align === 'right' ? area.x + area.width : cx;

  return (
    <g aria-hidden="true">
      {selected && <SelectionBox cx={cx} cy={cy} box={box} />}
      <text {...shared} textAnchor={anchor} x={x} y={firstBaseline}>
        {content.map((line, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : lineStep}>
            {/* A genuinely blank line still has to take up its space. */}
            {line === '' ? ' ' : line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** A hairline marker showing which block the panel is currently editing. */
function SelectionBox({
  cx,
  cy,
  box,
}: {
  cx: number;
  cy: number;
  box: BlockBox;
}) {
  const pad = 3;
  return (
    <rect
      x={cx - box.halfWidth - pad}
      y={cy - box.up - pad}
      width={box.halfWidth * 2 + pad * 2}
      height={box.up + box.down + pad * 2}
      fill="none"
      stroke="#a76a2b"
      strokeWidth={0.6}
      strokeDasharray="3 2.5"
      opacity={0.85}
      rx={1}
    />
  );
}
