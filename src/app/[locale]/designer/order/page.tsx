import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OrderForm } from '@/components/sign/OrderForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'order' });
  return {
    title: t('title'),
    description: t('lede'),
    // Nothing to index: this page is meaningless without a design in the
    // visitor's own browser.
    robots: { index: false, follow: true },
  };
}

export default async function OrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrderForm />;
}
