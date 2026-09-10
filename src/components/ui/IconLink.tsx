import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cx } from '@/lib/cx';

/**
 * A square action carrying only a symbol.
 *
 * Used where a third worded button would crowd a row that already has two.
 * The label is not omitted — it moves into `aria-label` and the native tooltip,
 * so the control is still announced and still explains itself on hover. An icon
 * with no accessible name is a button nobody who cannot see it can use.
 */
export function IconLink({
  label,
  children,
  className,
  variant = 'outline',
  ...props
}: {
  /** Announced to assistive technology and shown as the hover title. */
  label: string;
  children: ReactNode;
  variant?: 'outline' | 'solid';
  className?: string;
} & Omit<ComponentProps<typeof Link>, 'aria-label' | 'title'>) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={cx(
        'inline-grid place-items-center rounded-sm transition duration-150 ease-[var(--ease-wood)]',
        'h-12 w-12 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak',
        variant === 'solid'
          ? 'bg-ink text-surface shadow-sheet hover:-translate-y-px hover:shadow-lift'
          : 'border border-rule-strong bg-surface-2 text-ink-2 shadow-sheet hover:-translate-y-px hover:border-oak hover:text-ink hover:shadow-lift',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
