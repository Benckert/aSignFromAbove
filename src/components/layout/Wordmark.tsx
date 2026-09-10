import { site } from '@/config/site';
import { cx } from '@/lib/cx';

/**
 * The wordmark.
 *
 * Drawn from the business name in `site.ts` rather than an image file, so
 * renaming the workshop does not mean commissioning a new logo before the site
 * can go live. The chisel mark beside it is the one piece of graphic identity —
 * a V-cut seen end-on, which is exactly the profile the router leaves.
 */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <ChiselMark />
      <span
        className={cx(
          'display leading-none tracking-tight',
          compact ? 'text-[1.0625rem]' : 'text-[1.1875rem]',
        )}
      >
        {site.brand.name}
      </span>
    </span>
  );
}

/** The cross-section of a V-carved groove. */
function ChiselMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx('h-[1.35rem] w-[1.35rem] shrink-0', className)}
      aria-hidden="true"
      fill="none"
    >
      <rect x="1.5" y="4" width="21" height="16" rx="1.5" className="fill-oak/15" />
      {/* The groove: one lit wall, one in shadow. */}
      <path d="M6 5.5 L12 15 L18 5.5 Z" className="fill-ink/80" />
      <path d="M12 15 L18 5.5 L15.4 5.5 L12 15 Z" className="fill-ink/40" />
      <rect
        x="1.5"
        y="4"
        width="21"
        height="16"
        rx="1.5"
        className="stroke-ink/45"
        strokeWidth="1.2"
      />
    </svg>
  );
}
