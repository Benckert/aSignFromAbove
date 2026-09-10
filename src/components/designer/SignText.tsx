'use client';

import { useId } from 'react';
import { getFont } from '@/config/carving-fonts';
import type { TextBlock } from '@/lib/designer/types';
import { arcRadius, arcTextPath, circleTextPath, stackedRadius, toLines } from '@/lib/designer/geometry';
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
  /** Unique per preview, kept for callers that scope other defs by it. */
  uid: string;
  fill: string;
  filter?: string;
  /** Draws a faint box round the block, to show what is being edited. */
  selected?: boolean;
}

export function SignText({ block, area, capRatios, uid, fill, filter, selected }: Props) {
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

  // Block centre, in board millimetres.
  const cx = area.x + block.x * area.width;
  const cy = area.y + block.y * area.height;

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
    const baseRadius = isCircle
      ? block.circleRadiusMm
      : arcRadius(area.width * 0.92, block.curvature);

    return (
      <g aria-hidden="true">
        {selected && <SelectionBox area={area} cx={cx} cy={cy} block={block} />}
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
                  area.width * 0.92,
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
      {selected && <SelectionBox area={area} cx={cx} cy={cy} block={block} />}
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
  area,
  cx,
  cy,
  block,
}: {
  area: Props['area'];
  cx: number;
  cy: number;
  block: TextBlock;
}) {
  const w = area.width * 0.98;
  const h = Math.max(block.capHeightMm * 1.9, 12);
  return (
    <rect
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      fill="none"
      stroke="#a76a2b"
      strokeWidth={0.6}
      strokeDasharray="3 2.5"
      opacity={0.85}
      rx={1}
    />
  );
}
