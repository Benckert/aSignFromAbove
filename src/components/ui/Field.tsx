'use client';

import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The label + control + hint + error grouping used by every form on the site.
 *
 * The wiring here is what makes the forms usable with a screenreader: the label
 * is bound to the control, the hint and any error are announced through
 * aria-describedby, and an invalid control is marked as such rather than merely
 * turning red.
 */

interface Props {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Rendered small and quiet at the end of the label row, e.g. "420 mm". */
  readout?: ReactNode;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => ReactNode;
}

export function Field({ label, hint, error, required, readout, className, children }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
          {label}
          {required && (
            <span className="ml-1 text-rust" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {readout && <span className="spec shrink-0">{readout}</span>}
      </div>

      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}

      {hint && !error && (
        <p id={hintId} className="text-[0.75rem] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[0.75rem] leading-snug text-rust">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full rounded-sm border border-rule bg-surface px-3 py-2 text-[0.9375rem] text-ink ' +
  'placeholder:text-ink-3/70 transition-colors focus:border-oak focus:outline-none ' +
  'focus:ring-2 focus:ring-oak/20 aria-[invalid=true]:border-rust';
