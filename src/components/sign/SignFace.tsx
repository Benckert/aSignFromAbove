'use client';

import { getWood } from '@/config/woods';
import { borderLines, signOutlinePath } from '@/lib/sign/geometry';
import type { Sign } from '@/lib/sign/model';
import type { BlockBox } from '@/lib/sign/store';
import { isBlank } from '@/lib/sign/text';
import { isDark, shade } from '@/lib/sign/colour';
import { BlockText } from './BlockText';
import { BoardDefs } from './BoardDefs';

/**
 * A sign, drawn. Nothing that can be clicked.
 *
 * One renderer, used everywhere a sign appears: the designer's preview, the
 * examples on the front page, and the picture attached to an order. There used
 * to be two of these — the old designer's and the rebuilt one's — which is how
 * the front page ended up showing raised lettering as a blank board for a
 * while, fixed in one of them and not the other.
 *
 * Everything is in millimetres, matching the viewBox the caller sets up, so a
 * number here is a number on the finished board.
 */

export interface SignFaceProps {
  sign: Sign;
  /** Unique per instance, so two signs on one page cannot share a filter. */
  uid: string;
  /**
   * What has been measured about each block, keyed by id. Only alignment and
   * the anchor correction need it; the drawing is correct without it.
   */
  boxes?: Record<string, BlockBox>;
  /** Given when the caller wants the blocks measured as they are drawn. */
  onMeasure?: (id: string, box: BlockBox | null) => void;
}

export function SignFace({ sign, uid, boxes, onMeasure }: SignFaceProps) {
  const wood = getWood(sign.woodId);
  const outline = signOutlinePath(sign.shape, sign.widthMm, sign.heightMm);
  const painted = sign.finish === 'paint' || sign.finish === 'oilPaint';
  const raised = sign.method === 'raised';
  const carved = sign.blocks.some((block) => !isBlank(block.text));

  /*
    An unpainted cut reads as a shadow in pale timber and as exposed lighter
    fibre in dark timber, which is what actually happens under a bit.
  */
  const carveFill = painted
    ? sign.paintColour
    : isDark(wood.colour.base)
      ? shade(wood.colour.light, 0.14)
      : shade(wood.colour.dark, -0.42);

  const carveFilter = painted
    ? `url(#${uid}-painted)`
    : raised
      ? undefined
      : `url(#${uid}-engrave)`;

  /** The timber itself, defined once because raised lettering needs it twice. */
  const timber = (
    <g>
      <rect x={0} y={0} width={sign.widthMm} height={sign.heightMm} fill={wood.colour.base} />
      <rect
        x={0}
        y={0}
        width={sign.widthMm}
        height={sign.heightMm}
        fill={wood.colour.dark}
        filter={`url(#${uid}-grain)`}
        opacity={0.16 + wood.grainStrength * 0.4}
      />
      {/* Open pores and ray fleck, only on the species that really show them. */}
      {wood.grainStrength > 0.6 && (
        <rect
          x={0}
          y={0}
          width={sign.widthMm}
          height={sign.heightMm}
          fill={shade(wood.colour.dark, -0.3)}
          filter={`url(#${uid}-pores)`}
          opacity={0.16}
        />
      )}
      {(sign.finish === 'oil' || sign.finish === 'oilPaint') && (
        <rect x={0} y={0} width={sign.widthMm} height={sign.heightMm} fill={`url(#${uid}-oil)`} />
      )}
      <rect x={0} y={0} width={sign.widthMm} height={sign.heightMm} fill={`url(#${uid}-light)`} />
      <rect
        x={0}
        y={0}
        width={sign.widthMm}
        height={sign.heightMm}
        fill={`url(#${uid}-vignette)`}
      />
    </g>
  );

  const lettering = sign.blocks.map((block) => (
    <BlockText
      key={block.id}
      block={block}
      box={boxes?.[block.id]}
      fill={carveFill}
      filter={carveFilter}
      onMeasure={onMeasure}
    />
  ));

  return (
    <>
      <BoardDefs wood={wood} method={sign.method} uid={uid} />
      <defs>
        <clipPath id={`${uid}-shape`}>
          <path d={outline} />
        </clipPath>
        {/*
          Raised lettering keeps the original surface while the ground drops
          away, drawn by showing a second copy of the same board only where the
          text is — so the grain runs continuously through the letters instead
          of restarting inside them.

          A mask, not a clip path, and the distinction is not academic: a
          <clipPath> may contain only shapes, <text> and <use>, so the group
          wrapping the lettering was silently discarded, leaving an empty clip
          and a board with no letters on it at all. That shipped, and reached
          the front page. A mask takes arbitrary content: white shows the board
          through, black hides it.
        */}
        {raised && (
          <mask
            id={`${uid}-letters`}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={sign.widthMm}
            height={sign.heightMm}
          >
            <rect x={0} y={0} width={sign.widthMm} height={sign.heightMm} fill="#000" />
            {sign.blocks.map((block) => (
              <BlockText key={block.id} block={block} box={boxes?.[block.id]} fill="#fff" />
            ))}
          </mask>
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
        {timber}

        {/* Raised: the ground is now below the surface, so it is in shadow. */}
        {raised && carved && (
          <rect
            x={0}
            y={0}
            width={sign.widthMm}
            height={sign.heightMm}
            fill="#20160c"
            opacity={0.3}
          />
        )}

        {borderLines(sign).map((line, index) => (
          <path
            key={index}
            d={line.d}
            transform={`translate(${line.offsetMm} ${line.offsetMm})`}
            fill="none"
            stroke={carveFill}
            strokeWidth={line.widthMm}
            filter={carveFilter}
            opacity={0.92}
          />
        ))}

        {raised ? (
          <g filter={`url(#${uid}-raise)`}>
            <g mask={`url(#${uid}-letters)`}>{timber}</g>
            {/*
              Measured off-picture. The masked copy above carries no measurable
              geometry of its own, so the blocks are drawn once more, invisibly,
              purely to be asked how big they came out.
            */}
            {onMeasure && (
              <g opacity={0} aria-hidden="true">
                {lettering}
              </g>
            )}
          </g>
        ) : (
          lettering
        )}

        {/* A chamfered or rounded edge catches the light along its bevel. */}
        {sign.edge !== 'square' && (
          <path
            d={outline}
            fill="none"
            stroke={`url(#${uid}-edge)`}
            strokeWidth={sign.edge === 'roundover' ? 4 : 2.6}
            opacity={0.85}
          />
        )}
      </g>

      {/* The hairline that gives the blank a defined edge against the page. */}
      <path
        d={outline}
        fill="none"
        stroke={shade(wood.colour.dark, -0.35)}
        strokeWidth={0.5}
        opacity={0.55}
      />
    </>
  );
}
