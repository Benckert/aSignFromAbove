'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/cx';

/**
 * A collapsible group of controls.
 *
 * Each step in the designer still holds more than fits comfortably on a phone,
 * and most of it is settled after the first pass — nobody revisits the border
 * inset five times. Folding a group away is how someone keeps the two controls
 * they are actually working on next to each other.
 *
 * Not a native <details>: the summary here carries a live value on its right,
 * and the open state needs to survive being driven from outside.
 */
export function Disclosure({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  /** The current value, shown on the closed row so it need not be opened. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section
      className={cx(
        'overflow-hidden rounded-md border transition-colors',
        open ? 'border-rule-strong bg-surface-2' : 'border-rule bg-surface-2/60',
        className,
      )}
    >
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-3/50"
        >
          <ChevronDown
            size={15}
            aria-hidden
            className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
          />
          <span className="flex-1 text-[0.9375rem] font-medium text-ink">{title}</span>
          {summary && !open && (
            <span className="shrink-0 truncate text-[0.8125rem] text-ink-3">{summary}</span>
          )}
        </button>
      </h3>

      {open && (
        <div id={id} className="flex flex-col gap-4 border-t border-rule px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}
