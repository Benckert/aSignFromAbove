'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { SignPreview } from '@/components/designer/SignPreview';
import { defaultDesign, makeTextBlock } from '@/lib/designer/defaults';
import type { SignDesign } from '@/lib/designer/types';
import { cx } from '@/lib/cx';

/**
 * The sign on the front page, drawn by the same renderer the design tool uses.
 *
 * It cycles through real configurations, which shows that the preview is live
 * rather than a photograph and shows the range at the same time.
 *
 * Three things it has to get right:
 *
 * The frame never changes size. Boards here run from 300 × 300 to 520 × 220,
 * and letting each one size its own container made the page jump on every
 * change. The frame is a fixed box and each sign is fitted inside it, so only
 * the sign changes.
 *
 * It can be driven by hand — arrows, dots, and the arrow keys once focused.
 *
 * And it yields. Taking manual control stops the automatic advance for good;
 * hovering or focusing pauses it while you are there. Something that keeps
 * moving under a cursor that is trying to look at it is an irritation, not a
 * feature.
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

/** Milliseconds each sign is held before the next one. */
const INTERVAL = 5200;

/**
 * Whether the visitor has asked for less movement.
 *
 * A media query is external state, so it is read with useSyncExternalStore
 * rather than copied into a useState by an effect — which would render once
 * with a guess and then correct itself. The server snapshot is false, since a
 * preference that lives in the browser cannot be known before it is reached.
 */
function subscribeToMotionPreference(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export function HeroSign({ label }: { label: string }) {
  const t = useTranslations('home.livePreview');
  const [index, setIndex] = useState(0);
  /** Set once the visitor drives it themselves; never cleared. */
  const [manual, setManual] = useState(false);
  /** Set while the pointer or focus is inside; cleared when it leaves. */
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const running = !manual && !paused && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), INTERVAL);
    return () => window.clearInterval(id);
  }, [running]);

  const go = useCallback((next: number) => {
    setManual(true);
    setIndex((next + SCENES.length) % SCENES.length);
  }, []);

  return (
    <div
      className="group/slides relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}
    >
      {/*
        The fixed frame. Its aspect ratio is the widest board on offer, and
        every sign is centred inside it, so nothing on the page moves as the
        slides change.
      */}
      <div className="relative aspect-[13/9] w-full sm:aspect-[16/10]">
        {SCENES.map((scene, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className={cx(
              'absolute inset-0 grid place-items-center transition-opacity duration-700 ease-[var(--ease-wood)]',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <SignPreview
              design={scene}
              label={label}
              className="h-full max-h-full w-full max-w-full"
            />
          </div>
        ))}

        {/* Arrows appear on hover on a pointer device, and are always present
            for touch and keyboard. */}
        <SlideButton
          side="left"
          label={t('previous')}
          onClick={() => go(index - 1)}
        />
        <SlideButton
          side="right"
          label={t('next')}
          onClick={() => go(index + 1)}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label={label}>
          {SCENES.map((_, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={i === index}
              aria-label={`${i + 1} / ${SCENES.length}`}
              onClick={() => go(i)}
              className="group/dot py-2"
            >
              <span
                className={cx(
                  'block h-px w-7 transition-all duration-500',
                  i === index ? 'bg-ink' : 'bg-rule-strong group-hover/dot:bg-ink-3',
                )}
              />
            </button>
          ))}
        </div>

        {/* Only offered while there is something to pause. Once someone has
            taken manual control the automatic advance is finished, and a
            pause button for a stopped thing is noise. */}
        {!manual && !reducedMotion && (
          <button
            type="button"
            onClick={() => setManual(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[0.75rem] text-ink-3 transition hover:text-ink"
          >
            <Pause size={12} aria-hidden />
            {t('pause')}
          </button>
        )}
        {manual && !reducedMotion && (
          <button
            type="button"
            onClick={() => setManual(false)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[0.75rem] text-ink-3 transition hover:text-ink"
          >
            <Play size={12} aria-hidden />
            {t('play')}
          </button>
        )}
      </div>
    </div>
  );
}

function SlideButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx(
        'absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full',
        'border border-rule bg-surface/80 text-ink-2 backdrop-blur-sm transition',
        'hover:border-rule-strong hover:bg-surface hover:text-ink',
        // Hidden until wanted on a mouse, always there for touch.
        'opacity-0 group-hover/slides:opacity-100 focus-visible:opacity-100',
        '[@media(hover:none)]:opacity-100',
        // Inside the frame at every width: hanging them outside pushed past
        // the viewport once the hero column had a negative right margin.
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      {side === 'left' ? (
        <ChevronLeft size={17} aria-hidden />
      ) : (
        <ChevronRight size={17} aria-hidden />
      )}
    </button>
  );
}
