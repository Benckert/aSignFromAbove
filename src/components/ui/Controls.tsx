'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The controls the designer is built from.
 *
 * Two rules run through all of them. First, every control shows its current
 * value as a number in the monospaced spec face — a customer configuring a
 * physical object needs to know it is 420 mm, not "about three-quarters along".
 * Second, they are all sized for a fingertip: the designer is as likely to be
 * used on a phone in a kitchen as at a desk.
 */

/* ── Slider ───────────────────────────────────────────────────────────── */

interface SliderProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
  disabled?: boolean;
}

export function Slider({ value, min, max, step = 1, onChange, ...rest }: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="range-wood h-6 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
      style={{ ['--progress' as string]: `${progress}%` }}
      {...rest}
    />
  );
}

/* ── Segmented control ────────────────────────────────────────────────── */

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown under the label in the wider variant. */
  detail?: string;
  title?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Segment<T>[];
  onChange: (value: T) => void;
  label: string;
  /** Lets the options wrap instead of sharing one row. */
  wrap?: boolean;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  wrap,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'rounded-md border border-rule bg-surface p-1 shadow-[var(--shadow-inset)]',
        wrap ? 'flex flex-wrap gap-0.5' : 'grid auto-cols-fr grid-flow-col gap-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cx(
              'min-h-9 rounded-sm px-2.5 py-1.5 text-[0.8125rem] transition',
              'duration-150 ease-[var(--ease-wood)]',
              wrap && 'grow',
              selected
                ? 'bg-ink text-surface shadow-sheet'
                : 'text-ink-2 hover:bg-surface-3/70 hover:text-ink',
            )}
          >
            <span className="block leading-tight">{option.label}</span>
            {option.detail && (
              <span
                className={cx(
                  'mt-0.5 block text-[0.6875rem] leading-tight',
                  selected ? 'text-surface/70' : 'text-ink-3',
                )}
              >
                {option.detail}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Swatch grid, for timbers and paint ───────────────────────────────── */

export interface SwatchOption {
  value: string;
  label: string;
  sub?: string;
  colour: string;
  /** A second colour, drawn as a band, to hint at the grain. */
  accent?: string;
}

export function SwatchGrid({
  value,
  options,
  onChange,
  label,
  columns = 4,
}: {
  value: string;
  options: SwatchOption[];
  onChange: (value: string) => void;
  label: string;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'group rounded-md border p-1.5 text-left transition duration-150 ease-[var(--ease-wood)]',
              selected
                ? 'border-ink bg-surface-2 shadow-lift ring-1 ring-ink'
                : 'border-rule hover:-translate-y-px hover:border-rule-strong hover:bg-surface-2 hover:shadow-sheet',
            )}
          >
            <span
              className="block h-9 w-full rounded-sm border border-black/25 shadow-[0_1px_0_0_rgb(255_240_214/0.12)_inset,0_1px_3px_rgb(0_0_0/0.35)]"
              style={{
                background: option.accent
                  ? `repeating-linear-gradient(96deg, ${option.colour} 0 6px, ${option.accent} 6px 8px)`
                  : option.colour,
              }}
              aria-hidden="true"
            />
            <span className="mt-1 block truncate text-[0.75rem] font-medium text-ink">
              {option.label}
            </span>
            {option.sub && (
              <span className="block truncate text-[0.6875rem] text-ink-3">{option.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Panel section ────────────────────────────────────────────────────── */

export function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-t border-rule py-6 first:border-t-0 first:pt-0">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[1rem] font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/* ── Toggle ───────────────────────────────────────────────────────────── */

export function Checkbox({
  checked,
  onChange,
  children,
  id,
  'aria-describedby': describedBy,
  invalid,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  id?: string;
  'aria-describedby'?: string;
  invalid?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-snug text-ink-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.checked)}
        className={cx(
          'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border accent-ink',
          invalid ? 'border-rust' : 'border-rule-strong',
        )}
      />
      <span>{children}</span>
    </label>
  );
}
