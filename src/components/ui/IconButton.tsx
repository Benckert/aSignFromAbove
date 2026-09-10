import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The button counterpart to IconLink: a symbol with its wording moved into the
 * accessible name and the hover title, so nothing is lost to anyone who cannot
 * see it or does not recognise the mark.
 */
export function IconButton({
  label,
  children,
  className,
  ...props
}: { label: string; children: ReactNode; className?: string } & Omit<
  ComponentProps<'button'>,
  'aria-label' | 'title'
>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid h-9 w-9 place-items-center rounded-sm text-ink-2 transition',
        'hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak',
        className,
      )}
      {...props}
    />
  );
}
