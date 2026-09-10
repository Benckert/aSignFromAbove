import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AppPathname } from '@/i18n/routing';
import { site } from '@/config/site';
import { Wordmark } from './Wordmark';

/**
 * Footer.
 *
 * It carries the trader information Swedish e-commerce law requires to be
 * directly accessible — name, address, company registration number and contact
 * details — which is why it is a little denser than a decorative footer would be.
 */
export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const locale = useLocale();
  const year = new Date().getFullYear();
  const country = site.contact.address.country[locale === 'en' ? 'en' : 'sv'];

  const explore: Array<{ href: AppPathname; label: string }> = [
    { href: '/designer', label: nav('designer') },
    { href: '/furniture', label: nav('furniture') },
    { href: '/custom', label: nav('custom') },
    { href: '/workshop', label: nav('workshop') },
  ];

  const legal: Array<{ href: AppPathname; label: string }> = [
    { href: '/terms', label: t('terms') },
    { href: '/privacy', label: t('privacy') },
    { href: '/cookies', label: t('cookies') },
  ];

  return (
    <footer className="mt-16 border-t border-rule bg-surface-2">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <div className="lg:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-[26ch] text-[0.8125rem] leading-relaxed text-ink-3">
            {site.brand.tagline[locale === 'en' ? 'en' : 'sv']}
          </p>
          <p className="mt-4 text-[0.75rem] text-ink-3">{t('madeIn')}</p>
        </div>

        <FooterColumn title={t('sections.explore')}>
          {explore.map((item) => (
            <FooterLink key={item.href} href={item.href}>
              {item.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t('sections.legal')}>
          {legal.map((item) => (
            <FooterLink key={item.href} href={item.href}>
              {item.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t('sections.contact')}>
          <li>
            <a
              href={`mailto:${site.contact.email}`}
              className="text-[0.8125rem] text-ink-2 underline-offset-4 transition hover:text-ink hover:underline"
            >
              {site.contact.email}
            </a>
          </li>
          {site.contact.phone && (
            <li>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                className="text-[0.8125rem] text-ink-2 underline-offset-4 transition hover:text-ink hover:underline"
              >
                {site.contact.phone}
              </a>
            </li>
          )}
          <li className="pt-1 text-[0.8125rem] leading-relaxed text-ink-3">
            {site.contact.address.street}
            <br />
            {site.contact.address.postalCode} {site.contact.address.city}
            <br />
            {country}
          </li>
        </FooterColumn>
      </div>

      <div className="border-t border-rule">
        <div className="shell flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="spec">{t('copyright', { year, name: site.legal.entityName })}</p>
          <p className="spec">
            {site.legal.organisationNumber}
            {site.legal.vatRegistered && ` · ${site.legal.vatNumber}`}
            {site.legal.fskatt && ' · F-skatt'}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label mb-3">{title}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: AppPathname; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[0.8125rem] text-ink-2 underline-offset-4 transition hover:text-ink hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}
