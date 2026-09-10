'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { getWood } from '@/config/woods';
import type { SignDesign } from '@/lib/designer/types';
import { decorationDepthMm, safeArea, signOutlinePath, toLines } from '@/lib/designer/geometry';
import { isDark, shade } from '@/lib/designer/colour';
import { fallbackCapRatios, invalidateCapRatios, measureCapRatios } from '@/lib/designer/measure';
import { WoodDefs } from './WoodDefs';
import { SignText } from './SignText';
import { Decorations } from './Decorations';

/**
 * The live preview.
 *
 * The whole drawing is one SVG whose viewBox is measured in millimetres, so
 * every number inside it is a real dimension on the finished board. Nothing is
 * scaled by hand; the browser fits the millimetres to whatever space the
 * layout gives it, which is also what makes the preview work identically on a
 * phone and a desktop.
 *
 * Redrawing is just React re-rendering an SVG, so it keeps up with a dragged
 * slider without any throttling.
 */

interface Props {
  design: SignDesign;
  /** Highlights the block being edited. */
  activeTextId?: string | null;
  /** Handed back so the page can export what is on screen. */
  svgRef?: React.RefObject<SVGSVGElement | null>;
  /** Accessible description; the drawing itself is decorative to a screenreader. */
  label: string;
  className?: string;
}

/** Breathing room round the board for the shadow it casts, in mm. */
const PAD = 10;

export function SignPreview({
  design,
  activeTextId,
  svgRef,
  label,
  className,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const wood = getWood(design.woodId);
  const localRef = useRef<SVGSVGElement | null>(null);
  const ref = svgRef ?? localRef;

  // The first render — on the server and in the browser alike — uses the
  // catalogue's declared ratios, so the two agree. The real figures are
  // measured from the loaded font files afterwards and swapped in, which is
  // what makes a cap height of 52 mm actually 52 mm on the finished board.
  const [capRatios, setCapRatios] = useState<Record<string, number>>(fallbackCapRatios);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      invalidateCapRatios();
      setCapRatios(measureCapRatios());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { widthMm: w, heightMm: h } = design;
  const area = safeArea(design.shape, w, h, decorationDepthMm(design.decoration));
  const outline = signOutlinePath(design.shape, w, h);

  /* ── Colours ─────────────────────────────────────────────────────────── */

  const woodIsDark = isDark(wood.colour.base);
  const painted = design.finish === 'paint' || design.finish === 'oilPaint';
  const oiled = design.finish === 'oil' || design.finish === 'oilPaint';

  // An unpainted cut reads as a shadow in pale timber and as exposed lighter
  // fibre in dark timber, which is what actually happens under a bit.
  const carveFill = painted
    ? design.paintColour
    : woodIsDark
      ? shade(wood.colour.light, 0.14)
      : shade(wood.colour.dark, -0.42);

  const carveFilter = painted
    ? `url(#${uid}-painted)`
    : design.method === 'raised'
      ? undefined
      : `url(#${uid}-engrave)`;

  const hasContent = design.texts.some((t) => toLines(t.content).join('').trim()) || design.artwork;

  /* ── The board itself, defined once and reused ───────────────────────── */

  const board = (
    <g>
      <rect x={0} y={0} width={w} height={h} fill={wood.colour.base} />
      {/* Growth rings */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={wood.colour.dark}
        filter={`url(#${uid}-grain)`}
        opacity={0.16 + wood.grainStrength * 0.4}
      />
      {/* Open pores and ray fleck, only where the species really shows them */}
      {wood.grainStrength > 0.6 && (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={shade(wood.colour.dark, -0.3)}
          filter={`url(#${uid}-pores)`}
          opacity={0.16}
        />
      )}
      {oiled && <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}-oil)`} />}
      <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}-light)`} />
      <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}-vignette)`} />
    </g>
  );

  const textLayer = (
    <g>
      {design.texts.map((block) => (
        <SignText
          key={block.id}
          block={block}
          area={area}
          capRatios={capRatios}
          uid={uid}
          fill={carveFill}
          filter={carveFilter}
          selected={activeTextId === block.id}
        />
      ))}
    </g>
  );

  return (
    <svg
      ref={ref}
      viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
      className={className}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <WoodDefs wood={wood} method={design.method} uid={uid} />

      <defs>
        <clipPath id={`${uid}-shape`}>
          <path d={outline} />
        </clipPath>
        {/*
          For raised lettering the letters keep the original surface while the
          ground drops away. That is drawn by clipping a second copy of the very
          same board to the shape of the text, so the grain runs continuously
          through the letters instead of restarting inside them.
        */}
        {design.method === 'raised' && (
          <clipPath id={`${uid}-letters`}>
            {design.texts.map((block) => (
              <SignText
                key={block.id}
                block={block}
                area={area}
                capRatios={capRatios}
                uid={`${uid}c`}
                fill="#000"
              />
            ))}
          </clipPath>
        )}
      </defs>

      {/* The shadow the board casts on the wall behind it. */}
      <path
        d={outline}
        fill="#2b1f12"
        opacity={0.2}
        transform="translate(2.5, 4)"
        style={{ filter: 'blur(3px)' }}
      />

      <g clipPath={`url(#${uid}-shape)`}>
        {board}

        {/* Raised: the ground is now below the surface, so it is in shadow. */}
        {design.method === 'raised' && hasContent && (
          <rect x={0} y={0} width={w} height={h} fill="#20160c" opacity={0.3} />
        )}

        <Decorations design={design} area={area} uid={uid} carveFill={carveFill} />

        {design.method === 'raised' ? (
          <g filter={`url(#${uid}-raise)`}>
            <g clipPath={`url(#${uid}-letters)`}>{board}</g>
          </g>
        ) : (
          textLayer
        )}

        {design.artwork && <Artwork design={design} fill={carveFill} filter={carveFilter} />}

        {/* A chamfered or rounded edge catches the light along its bevel. */}
        {design.edge !== 'square' && (
          <path
            d={outline}
            fill="none"
            stroke={`url(#${uid}-edge)`}
            strokeWidth={design.edge === 'roundover' ? 4 : 2.6}
            opacity={0.85}
          />
        )}
      </g>

      {/* A hairline round the board so it reads as an object on the page. */}
      <path d={outline} fill="none" stroke={shade(wood.colour.dark, -0.35)} strokeWidth={0.5} opacity={0.55} />

    </svg>
  );
}

/** Customer-supplied artwork, placed and scaled on the board. */
function Artwork({
  design,
  fill,
  filter,
}: {
  design: SignDesign;
  fill: string;
  filter?: string;
}) {
  const art = design.artwork;
  if (!art) return null;

  const area = safeArea(
    design.shape,
    design.widthMm,
    design.heightMm,
    decorationDepthMm(design.decoration),
  );
  const width = art.widthMm;
  const height = width / (art.aspect || 1);
  const x = area.x + art.x * area.width - width / 2;
  const y = area.y + art.y * area.height - height / 2;

  return (
    <g
      transform={`rotate(${art.rotation} ${x + width / 2} ${y + height / 2})`}
      color={fill}
      filter={filter}
      aria-hidden="true"
    >
      <svg
        x={x}
        y={y}
        width={width}
        height={height}
        viewBox={extractViewBox(art.svg)}
        preserveAspectRatio="xMidYMid meet"
        // The markup has already been through the sanitiser in artwork.ts, and
        // is re-checked on the server before an order is accepted.
        dangerouslySetInnerHTML={{ __html: stripOuterSvg(art.svg) }}
      />
    </g>
  );
}

function extractViewBox(svg: string): string {
  return svg.match(/viewBox=["']([^"']+)["']/)?.[1] ?? '0 0 100 100';
}

function stripOuterSvg(svg: string): string {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
}
