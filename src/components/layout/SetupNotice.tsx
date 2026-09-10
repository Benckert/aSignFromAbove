import { hasPlaceholderDetails, site } from '@/config/site';

/**
 * A development-only reminder that the business details are still placeholders.
 *
 * The site is legally incomplete without them — Swedish e-commerce law requires
 * the trader's name, address and organisation number to be directly accessible,
 * and the privacy policy has to name the controller. Those placeholders render
 * as visible "TODO" text on the terms and privacy pages, but it is easy to stop
 * noticing something you have looked at fifty times.
 *
 * Renders nothing in production, so it can never be seen by a visitor. If the
 * site somehow ships with placeholders, the pages themselves still say so
 * plainly rather than inventing a company number.
 */
export function SetupNotice() {
  if (process.env.NODE_ENV === 'production' || !hasPlaceholderDetails()) return null;

  return (
    <aside className="border-b border-oak/40 bg-oak-wash px-4 py-2 text-center">
      <p className="text-[0.75rem] leading-snug text-ink-2">
        <strong className="font-semibold text-ink">Development:</strong>{' '}
        <code className="font-mono">src/config/site.ts</code> still contains placeholder business
        details. Fill in the name, address, organisation number and email before{' '}
        {site.brand.name} goes live.
      </p>
    </aside>
  );
}
