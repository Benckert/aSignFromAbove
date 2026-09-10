'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { cx } from '@/lib/cx';

/**
 * Switches between Swedish and English while staying on the same page.
 *
 * `usePathname` from the i18n navigation helpers returns the canonical route
 * (`/designer`), not the localised URL, which is what makes it possible to swap
 * `/designa-skylt` for `/en/design-your-sign` rather than dropping the visitor
 * back on the home page — the single most annoying thing a language switch can do.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('meta');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          router.replace(
            // @ts-expect-error — params carries the dynamic segments of the
            // current route, which the typed navigation cannot know statically.
            { pathname, params },
            { locale: other },
          );
        })
      }
      className={cx(
        'spec rounded-xs px-2 py-1.5 transition hover:bg-surface-3 hover:text-ink',
        'disabled:opacity-50',
        className,
      )}
      // Announce the destination language, not the current one.
      lang={other}
    >
      {t('switchTo')}
    </button>
  );
}
