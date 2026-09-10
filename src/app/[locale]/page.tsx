import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { CallToAction } from '@/components/home/CallToAction';
import { carvingFontVariables } from '@/config/carving-fonts.loader';

/**
 * The front page: a sign, a way into the tool that made it, one sentence on
 * what happens next, and one invitation to talk if a sign is not the thing.
 *
 * Two sections. It began as six.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // The hero draws a real sign, so it needs the carving faces.
    <div className={carvingFontVariables}>
      <Hero />
      <CallToAction />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return { description: t('lede') };
}
