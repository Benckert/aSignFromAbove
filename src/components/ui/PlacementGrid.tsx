'use client';

import { cx } from '@/lib/cx';

/**
 * A nine-point placement picker.
 *
 * Two sliders can put a block of text anywhere on the board, but nobody thinks
 * in per-cent-from-the-left — they think "top middle" or "bottom right". This
 * gives them that in one tap, and the sliders underneath stay for the cases
 * where a couple of millimetres matter.
 *
 * The grid mirrors the board's proportions, so on a long low sign it is a long
 * low grid: the control looks like the thing it controls.
 */

/** Where each of the nine points sits, as a fraction of the safe area. */
const STOPS = [0.15, 0.5, 0.85] as const;

export function PlacementGrid({
  x,
  y,
  onChange,
  label,
  aspect,
}: {
  x: number;
  y: number;
  onChange: (position: { x: number; y: number }) => void;
  label: string;
  /** Board width ÷ height, so the control matches the sign's shape. */
  aspect: number;
}) {
  // Keep it usable at the extremes: a 1200 × 60 board would otherwise give a
  // grid too flat to hit.
  const clamped = Math.min(Math.max(aspect, 0.7), 2.6);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid w-full max-w-[13rem] grid-cols-3 gap-1 rounded-md border border-rule bg-surface-2 p-1"
      style={{ aspectRatio: String(clamped) }}
    >
      {STOPS.map((py) =>
        STOPS.map((px) => {
          // Nearest-point matching, so a nudged slider still lights up the
          // cell it is closest to rather than leaving all nine looking unset.
          const selected =
            nearest(x) === px && nearest(y) === py;
          return (
            <button
              key={`${px}-${py}`}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${describe(px, 'x')} ${describe(py, 'y')}`}
              onClick={() => onChange({ x: px, y: py })}
              className={cx(
                'grid place-items-center rounded-sm transition',
                selected ? 'bg-ink' : 'hover:bg-surface-3',
              )}
            >
              <span
                className={cx(
                  'h-1.5 w-1.5 rounded-full transition',
                  selected ? 'bg-surface' : 'bg-ink-3',
                )}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}

function nearest(value: number): number {
  return STOPS.reduce((best, stop) =>
    Math.abs(stop - value) < Math.abs(best - value) ? stop : best,
  );
}

/** Only ever read by a screenreader, so it stays in plain words. */
function describe(stop: number, axis: 'x' | 'y'): string {
  if (stop === 0.5) return axis === 'x' ? 'centre' : 'middle';
  if (axis === 'x') return stop < 0.5 ? 'left' : 'right';
  return stop < 0.5 ? 'top' : 'bottom';
}
