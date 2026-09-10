'use client';

import { useEffect, useState } from 'react';
import { SignPreview } from '@/components/designer/SignPreview';
import { defaultDesign, makeTextBlock } from '@/lib/designer/defaults';
import type { SignDesign } from '@/lib/designer/types';

/**
 * The sign on the front page, drawn by the same renderer the design tool uses.
 *
 * It slowly cycles through a handful of real configurations, which does two
 * jobs at once: it shows that the preview is live rather than a picture, and it
 * shows the range — different timbers, shapes and cutting methods — without a
 * paragraph explaining that the range exists.
 *
 * It respects a reduced-motion preference by simply not cycling.
 */

const SCENES: SignDesign[] = [
  {
    ...defaultDesign(),
    widthMm: 420,
    heightMm: 230,
    woodId: 'ek',
    shape: 'rounded',
    method: 'vcarve',
    finish: 'oil',
    texts: [
      makeTextBlock({ content: 'Björkhaga', capHeightMm: 36, y: 0.42 }),
      makeTextBlock({
        content: 'sedan 1953',
        fontId: 'baskerville',
        capHeightMm: 14,
        letterSpacing: 0.14,
        y: 0.7,
      }),
    ],
  },
  {
    ...defaultDesign(),
    widthMm: 460,
    heightMm: 250,
    woodId: 'valnot',
    shape: 'arch',
    method: 'vcarve',
    finish: 'oil',
    decoration: { border: 'double', insetMm: 14, corners: 'diamond' },
    texts: [
      makeTextBlock({
        content: 'Välkommen',
        fontId: 'cinzel',
        capHeightMm: 30,
        wrap: 'arcUp',
        curvature: 0.4,
        y: 0.44,
      }),
      makeTextBlock({ content: 'Stig på', fontId: 'dancing', capHeightMm: 22, y: 0.74 }),
    ],
  },
  {
    ...defaultDesign(),
    widthMm: 520,
    heightMm: 220,
    woodId: 'furu',
    shape: 'rect',
    method: 'vcarve',
    finish: 'paint',
    paintColour: '#26312a',
    decoration: { border: 'inset', insetMm: 16, corners: 'none' },
    texts: [
      makeTextBlock({ content: 'Sjöstugan', fontId: 'oswald', capHeightMm: 54, y: 0.44 }),
      makeTextBlock({
        content: 'Familjen Lind',
        fontId: 'oswald',
        capHeightMm: 17,
        letterSpacing: 0.1,
        y: 0.74,
      }),
    ],
  },
  {
    ...defaultDesign(),
    widthMm: 300,
    heightMm: 300,
    woodId: 'bjork',
    shape: 'oval',
    method: 'raised',
    finish: 'oil',
    decoration: { border: 'line', insetMm: 12, corners: 'none' },
    texts: [
      makeTextBlock({
        content: 'Bageriet',
        fontId: 'cinzel',
        capHeightMm: 20,
        letterSpacing: 0.18,
        wrap: 'circle',
        circleRadiusMm: 108,
      }),
      makeTextBlock({
        content: 'Est.\n1998',
        fontId: 'baskerville',
        capHeightMm: 20,
        lineHeight: 1.5,
      }),
    ],
  },
];

const INTERVAL = 5200;

export function HeroSign({ label }: { label: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <SignPreview
        key={index}
        design={SCENES[index]}
        label={label}
        className="mx-auto h-auto w-full max-h-[52vh] animate-[fade-in_700ms_var(--ease-wood)]"
      />

      {/* Which of the scenes is showing. Not a carousel control — there is
          nothing here worth clicking, and pretending otherwise wastes a tap. */}
      <div className="mt-4 flex justify-center gap-1.5 lg:justify-start lg:pl-4" aria-hidden="true">
        {SCENES.map((_, i) => (
          <span
            key={i}
            className={
              'h-px w-6 transition-colors duration-500 ' +
              (i === index ? 'bg-ink' : 'bg-rule-strong')
            }
          />
        ))}
      </div>
    </div>
  );
}
