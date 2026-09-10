'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cx } from '@/lib/cx';

/**
 * Switches between Swedish and English while staying on the same page.
 *
 * `usePathname` from the i18n navigation helpers returns the canonical route
 * (`/designer`), not the localised URL, which is what makes it possible to swap
 * `/designa-skylt` for `/en/design-your-sign` rather than dropping the visitor
 * back on the home page — the single most annoying thing a language switch can
 * do.
 *
 * The flag shown is the one you would get by pressing it, not the one you are
 * on, matching every other control on the site: a button is labelled with what
 * it does. The accessible name says so in words, because a flag is a country
 * rather than a language and should never be the only thing carrying meaning.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('meta');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const other = (routing.locales.find((l) => l !== locale) ?? routing.defaultLocale) as Locale;

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
        'inline-flex h-9 w-9 items-center justify-center rounded-sm transition',
        'hover:bg-surface-3 disabled:opacity-50',
        className,
      )}
      aria-label={t('switchTo')}
      title={t('switchTo')}
    >
      <Flag locale={other} />
    </button>
  );
}

/**
 * Drawn rather than an emoji: flag emoji do not render at all on Windows,
 * which is most of the audience for a Swedish site.
 */
function Flag({ locale }: { locale: Locale }) {
  const shared = 'h-[0.95rem] w-[1.35rem] rounded-[2px] ring-1 ring-inset ring-black/25';

  if (locale === 'sv') {
    return (
      <svg viewBox="0 0 16 10" className={shared} aria-hidden="true">
        <rect width="16" height="10" fill="#005293" />
        <rect x="5" width="2" height="10" fill="#fecb00" />
        <rect y="4" width="16" height="2" fill="#fecb00" />
      </svg>
    );
  }

  // Union flag, simplified to the shapes that survive at this size.
  return (
    <svg viewBox="0 0 16 10" className={shared} aria-hidden="true">
      <rect width="16" height="10" fill="#012169" />
      <path d="M0 0 16 10M16 0 0 10" stroke="#fff" strokeWidth="2" />
      <path d="M0 0 16 10M16 0 0 10" stroke="#C8102E" strokeWidth="1" />
      <path d="M8 0v10M0 5h16" stroke="#fff" strokeWidth="3.2" />
      <path d="M8 0v10M0 5h16" stroke="#C8102E" strokeWidth="1.9" />
    </svg>
  );
}
