import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CustomEnquiryForm } from '@/components/forms/CustomEnquiryForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'custom' });
  return { title: t('title'), description: t('lede') };
}

export default async function CustomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'custom' });

  return (
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{t('title')}</h1>
        <p className="prose-workshop mt-4">{t('lede')}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-14">
        <div className="lg:order-1">
          <CustomEnquiryForm />
        </div>

        {/* Said before the form rather than after it, so nobody fills in eight
            fields wondering whether they are about to be quoted at. */}
        <aside className="rounded-lg border border-rule bg-surface-2 p-5 lg:order-2 lg:sticky lg:top-24">
          <h2 className="text-[1.0625rem] font-semibold text-ink">{t('priceNote.title')}</h2>
          <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-2">{t('priceNote.body')}</p>
        </aside>
      </div>
    </div>
  );
}
