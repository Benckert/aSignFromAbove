'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import type { AppPathname } from '@/i18n/routing';
import { cx } from '@/lib/cx';
import { Wordmark } from './Wordmark';
import { LocaleSwitch } from './LocaleSwitch';
import { ThemeToggle } from './ThemeToggle';

/**
 * Site header.
 *
 * The one call to action is "design a sign", and it is the only emphasised
 * element. Everything else is a plain link, because a workshop site that shouts
 * at four different things at once is a workshop site nobody trusts.
 */

const LINKS: Array<{ href: AppPathname; key: string }> = [
  { href: '/furniture', key: 'furniture' },
  { href: '/workshop', key: 'workshop' },
  { href: '/contact', key: 'contact' },
];

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
    Close the mobile menu on navigation — leaving it open over the newly
    arrived page is a classic bug in hand-rolled headers.

    Adjusted during render against the previous path rather than in an effect.
    React documents this as the way to reset state when a prop changes: it
    re-renders immediately with the menu already closed, whereas an effect would
    paint the new page with the old menu still over it and then close it.
  */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Stop the page behind the open menu from scrolling.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-surface/85 backdrop-blur-sm">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-xs focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
      >
        {t('skipToContent')}
      </a>

      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="rounded-xs transition hover:opacity-80" aria-label={t('home')}>
          <Wordmark compact />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('menu')}>
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {t(link.key)}
            </NavLink>
          ))}
          <span className="mx-2 h-5 w-px bg-rule" aria-hidden="true" />
          <LocaleSwitch />
          <ThemeToggle label={t('theme')} />
          <Link
            href="/designer"
            className={cx(
              'ml-1 inline-flex h-9 items-center rounded-xs bg-ink px-4 text-[0.8125rem]',
              'font-medium text-surface shadow-sheet transition hover:bg-moss-deep hover:shadow-lift',
            )}
          >
            {t('designer')}
          </Link>
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle label={t('theme')} />
          <LocaleSwitch />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-xs text-ink transition hover:bg-surface-3"
          >
            <span className="sr-only">{open ? t('close') : t('menu')}</span>
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-rule bg-surface lg:hidden"
        >
          <nav className="shell flex flex-col py-3" aria-label={t('menu')}>
            <Link
              href="/designer"
              className="mb-2 inline-flex h-12 items-center justify-center rounded-xs bg-ink px-4 font-medium text-surface"
            >
              {t('designer')}
            </Link>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  'border-b border-rule/70 py-3.5 text-[0.9375rem] last:border-b-0',
                  pathname === link.href ? 'font-medium text-ink' : 'text-ink-2',
                )}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: AppPathname;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative rounded-xs px-3 py-2 text-[0.875rem] transition',
        active ? 'text-ink' : 'text-ink-2 hover:text-ink',
      )}
    >
      {children}
      {/* A cut line under the current page rather than a coloured pill. */}
      {active && (
        <span
          className="absolute inset-x-3 -bottom-px h-px bg-ink"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
