import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { site } from '@/config/site';
import { ContactForm } from '@/components/forms/ContactForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('title'), description: t('lede') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });
  const common = await getTranslations({ locale, namespace: 'common' });
  const country = site.contact.address.country[locale === 'en' ? 'en' : 'sv'];

  return (
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{t('title')}</h1>
        <p className="prose-workshop mt-4">{t('lede')}</p>
      </header>

      <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div>
          <h2 className="text-[1.0625rem] font-semibold text-ink">{t('form.title')}</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>

        <aside className="flex flex-col gap-7">
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="label">{t('email')}</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-[0.9375rem] text-oak-deep underline-offset-4 transition hover:text-ink hover:underline"
                >
                  {site.contact.email}
                </a>
              </dd>
            </div>
            {site.contact.phone && (
              <div>
                <dt className="label">{t('phone')}</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                    className="text-[0.9375rem] text-oak-deep underline-offset-4 transition hover:text-ink hover:underline"
                  >
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="label">{t('address')}</dt>
              <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">
                {site.contact.address.street}
                <br />
                {site.contact.address.postalCode} {site.contact.address.city}
                <br />
                {country}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-rule bg-surface-2 p-5">
            <h2 className="text-[0.9375rem] font-semibold text-ink">{t('visit.title')}</h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">{t('visit.body')}</p>
          </div>

          {/* Required to be directly accessible under Swedish e-commerce law. */}
          <div className="border-t border-rule pt-5">
            <h2 className="label mb-3">{t('business.title')}</h2>
            <dl className="flex flex-col gap-2 text-[0.8125rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">{t('business.org')}</dt>
                <dd className="font-mono text-[0.75rem] text-ink">{site.legal.organisationNumber}</dd>
              </div>
              {site.legal.vatRegistered && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t('business.vat')}</dt>
                  <dd className="font-mono text-[0.75rem] text-ink">{site.legal.vatNumber}</dd>
                </div>
              )}
              {site.legal.fskatt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t('business.fskatt')}</dt>
                  <dd className="font-mono text-[0.75rem] text-ink">{common('yes')}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
