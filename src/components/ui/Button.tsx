import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Buttons are square-cornered and solid. Nothing on this site is a pill or a
 * gradient: the visual language is sawn timber and printed surface.
 */

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition ' +
  'duration-150 ease-[var(--ease-wood)] disabled:cursor-not-allowed disabled:opacity-45 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-surface hover:bg-moss-deep active:translate-y-px shadow-sheet hover:shadow-lift',
  secondary:
    'border border-rule-strong bg-surface text-ink hover:border-ink hover:bg-surface-2 active:translate-y-px',
  quiet: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger: 'border border-rust/40 text-rust hover:bg-rust-wash',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-10 px-4 text-[0.875rem]',
  lg: 'h-12 px-6 text-[0.9375rem]',
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: Common & ComponentProps<'button'>) {
  return <button className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return <Link className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}
