import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument';
import { site } from '@/config/site';

const NAMESPACE = 'legal.privacy';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: NAMESPACE });
  return { title: t('title'), description: t('lede') };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: NAMESPACE });
  const legal = await getTranslations({ locale, namespace: 'legal' });

  const updated = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(site.legalUpdated));

  return (
    <LegalDocument
      title={t('title')}
      lede={t('lede')}
      // raw() rather than t(), because the business details in these strings
      // are substituted from site.ts and must not be read as ICU arguments.
      sections={t.raw('sections') as LegalSection[]}
      updated={legal('updated', { date: updated })}
    />
  );
}
