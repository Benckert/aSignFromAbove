import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Gallery } from '@/components/furniture/Gallery';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'furniture' });
  return { title: t('title'), description: t('lede') };
}

export default async function FurniturePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'furniture' });

  return (
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{t('title')}</h1>
        <p className="prose-workshop mt-4">{t('lede')}</p>
      </header>
      <div className="mt-10 lg:mt-14">
        <Gallery />
      </div>
    </div>
  );
}
