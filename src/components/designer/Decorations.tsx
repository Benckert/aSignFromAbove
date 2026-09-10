'use client';

import type { SignDesign } from '@/lib/designer/types';
import { signOutlinePath } from '@/lib/designer/geometry';

/**
 * Borders and corner motifs.
 *
 * These follow the outline of the board rather than sitting in a rectangle
 * inside it, so a border on an arched sign curves over the top the way a carved
 * one would. That is done by drawing the same outline path scaled down about
 * the board's centre — the cheapest honest approximation of an inset outline,
 * and visually correct for the shapes on offer.
 */

interface Props {
  design: SignDesign;
  area: { x: number; y: number; width: number; height: number };
  uid: string;
  carveFill: string;
}

export function Decorations({ design, carveFill }: Props) {
  const { border, insetMm, corners } = design.decoration;
  const { widthMm: w, heightMm: h } = design;

  if (border === 'none' && corners === 'none') return null;

  const outline = signOutlinePath(design.shape, w, h);

  /** Scales the outline inward by `inset` millimetres about the board centre. */
  const inset = (mm: number) => {
    const sx = (w - mm * 2) / w;
    const sy = (h - mm * 2) / h;
    if (sx <= 0 || sy <= 0) return null;
    return `translate(${w / 2} ${h / 2}) scale(${sx} ${sy}) translate(${-w / 2} ${-h / 2})`;
  };

  const primary = inset(insetMm);
  const secondary = inset(insetMm + 4);

  // A carved line is a groove: the same colour as the lettering, with a
  // thickness a bit or two wide rather than a hairline.
  const stroke = carveFill;

  return (
    <g aria-hidden="true" opacity={0.92}>
      {border === 'line' && primary && (
        <path d={outline} transform={primary} fill="none" stroke={stroke} strokeWidth={1.8} />
      )}

      {border === 'double' && primary && secondary && (
        <>
          <path d={outline} transform={primary} fill="none" stroke={stroke} strokeWidth={2} />
          <path d={outline} transform={secondary} fill="none" stroke={stroke} strokeWidth={0.9} />
        </>
      )}

      {/* A field routed shallowly below the surface, with the surface left
          proud around it — the classic recessed panel. */}
      {border === 'inset' && primary && (
        <>
          <path d={outline} transform={primary} fill="#000" opacity={0.1} />
          <path
            d={outline}
            transform={primary}
            fill="none"
            stroke={stroke}
            strokeWidth={1.2}
            opacity={0.75}
          />
        </>
      )}

      {border === 'notch' && primary && (
        <path
          d={outline}
          transform={primary}
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeDasharray={`${Math.max(w, h) * 0.16} ${Math.max(w, h) * 0.045}`}
          strokeLinecap="square"
        />
      )}

      {corners !== 'none' && <Corners design={design} fill={stroke} />}
    </g>
  );
}

/** Motifs at the four corners of the border. */
function Corners({ design, fill }: { design: SignDesign; fill: string }) {
  const { widthMm: w, heightMm: h } = design;
  const { corners, insetMm } = design.decoration;
  const d = insetMm + 7;

  // On a curved board the corners are pulled inward so they land on the timber
  // rather than off the edge.
  const pull = design.shape === 'oval' ? 0.16 : design.shape === 'arch' ? 0.07 : 0;
  const points: Array<[number, number]> = [
    [d + w * pull, d + h * pull],
    [w - d - w * pull, d + h * pull],
    [w - d - w * pull, h - d - h * pull],
    [d + w * pull, h - d - h * pull],
  ];

  const size = Math.min(w, h) * 0.028;

  return (
    <>
      {points.map(([x, y], i) => {
        if (corners === 'drilled') {
          return <circle key={i} cx={x} cy={y} r={size * 0.55} fill={fill} />;
        }
        if (corners === 'diamond') {
          return (
            <path
              key={i}
              d={`M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`}
              fill={fill}
            />
          );
        }
        // A leaf: two mirrored arcs meeting at a point, angled to face inward
        // from whichever corner it sits in.
        const flipX = i === 1 || i === 2 ? -1 : 1;
        const flipY = i >= 2 ? -1 : 1;
        return (
          <path
            key={i}
            transform={`translate(${x} ${y}) scale(${flipX} ${flipY})`}
            d={`M 0 0 C ${size * 1.6} ${size * 0.2} ${size * 1.9} ${size * 1.5} ${size * 0.2} ${size * 2.1} C ${size * 0.9} ${size * 1.2} ${size * 0.7} ${size * 0.5} 0 0 Z`}
            fill={fill}
          />
        );
      })}
    </>
  );
}
