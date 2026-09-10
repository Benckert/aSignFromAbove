import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { Steps } from '@/components/home/Steps';
import { Elsewhere } from '@/components/home/Elsewhere';
import { carvingFontVariables } from '@/config/carving-fonts.loader';

/**
 * The front page: a sign, a way into the tool that made it, four short lines
 * on what happens next, and a quiet row pointing at everything else.
 *
 * It used to carry a timber grid and three full-width sections as well. Those
 * said things the design tool says better, to a visitor who had not yet been
 * given a reason to care.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // The hero draws a real sign, so it needs the carving faces.
    <div className={carvingFontVariables}>
      <Hero />
      <Steps />
      <Elsewhere />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return { description: t('lede') };
}
