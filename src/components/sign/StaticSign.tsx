'use client';

import { useId } from 'react';
import type { Sign } from '@/lib/sign/model';
import { SignFace } from './SignFace';

/** Breathing room around the board, in mm, for the shadow it casts. */
const PAD = 12;

/**
 * A sign as a picture: no controls, nothing to click.
 *
 * Wherever a sign needs to be shown rather than edited — the examples on the
 * front page, a confirmation, a printed summary — this is it, and it is the
 * same renderer the designer's own preview uses. There used to be two of them,
 * which is how the front page came to show raised lettering as a blank board:
 * the bug was found and fixed in the designer's copy, and nobody thought to
 * look at the other one.
 */
export function StaticSign({
  sign,
  label,
  className,
  svgRef,
}: {
  sign: Sign;
  label: string;
  className?: string;
  /** Handed out so the order page can rasterise this into an attachment. */
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${sign.widthMm + PAD * 2} ${sign.heightMm + PAD * 2}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <SignFace sign={sign} uid={uid} />
    </svg>
  );
}
