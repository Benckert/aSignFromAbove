import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { HeroSign } from './HeroSign';

/**
 * The front page opens with the thing the site is actually for: a carved sign,
 * shown as the tool draws it. No stock photography, no hero video, no claim
 * about craftsmanship that the page then fails to demonstrate.
 *
 * The layout is deliberately off-centre. Everything on the left is set to a
 * measure you can read; the sign sits to the right and overhangs the column,
 * which is what stops it looking like a template with a picture slot.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const p = useTranslations('home.livePreview');

  return (
    <section className="relative overflow-hidden border-b border-rule">
      <div className="shell grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:py-24">
        <div>
          <p className="spec">{t('eyebrow')}</p>
          <h1 className="display mt-4 text-[clamp(2.35rem,6.2vw,4.15rem)]">{t('title')}</h1>
          <p className="prose-workshop mt-5 text-[1.0625rem]">{t('lede')}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/designer" variant="primary" size="lg">
              {t('primary')} <ArrowRight size={17} aria-hidden />
            </ButtonLink>
            <ButtonLink href="/furniture" variant="secondary" size="lg">
              {t('secondary')}
            </ButtonLink>
          </div>

          <p className="mt-5 text-[0.875rem] text-ink-3">{t('note')}</p>
        </div>

        <figure className="lg:-mr-12 xl:-mr-20">
          <HeroSign label={p('label')} />
          <figcaption className="mt-4 text-[0.875rem] text-ink-3 lg:pl-4">{p('caption')}</figcaption>
        </figure>
      </div>
    </section>
  );
}
