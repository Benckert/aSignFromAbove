import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Hero } from '@/components/home/Hero';
import { Steps } from '@/components/home/Steps';
import { Timbers } from '@/components/home/Timbers';
import { Teaser } from '@/components/home/Teaser';
import { FurniturePeek } from '@/components/home/FurniturePeek';
import { carvingFontVariables } from '@/config/carving-fonts.loader';

/**
 * The front page.
 *
 * The order is deliberate: show the thing, explain that trying it costs
 * nothing, show the materials, then the other work, and only then talk about
 * the person. Nothing here asks for an email address, and the only repeated
 * call to action is the design tool — which is free to use and commits nobody
 * to anything.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // The hero draws a real sign, so it needs the carving faces.
    <div className={carvingFontVariables}>
      <Hero />
      <Steps />
      <Timbers />
      <HomeTeasers />
    </div>
  );
}

function HomeTeasers() {
  const furniture = useTranslations('home.furniture');
  const custom = useTranslations('home.custom');
  const maker = useTranslations('home.maker');

  return (
    <>
      <Teaser
        eyebrow={furniture('eyebrow')}
        title={furniture('title')}
        lede={furniture('lede')}
        href="/furniture"
        cta={furniture('cta')}
        aside={<FurniturePeek />}
      />
      <Teaser
        eyebrow={custom('eyebrow')}
        title={custom('title')}
        lede={custom('lede')}
        href="/custom"
        cta={custom('cta')}
      />
      <Teaser
        eyebrow={maker('eyebrow')}
        title={maker('title')}
        lede={maker('lede')}
        href="/workshop"
        cta={maker('cta')}
        bordered={false}
      />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return { description: t('lede') };
}
