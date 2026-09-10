import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { HeroSign } from './HeroSign';

/**
 * The front page opens on the thing the site is for, and the only emphasised
 * action is the one that leads into the design tool. Everything else on this
 * page is deliberately quieter than this block.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const p = useTranslations('home.livePreview');

  return (
    <section className="border-b border-rule">
      <div className="shell grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-20">
        <div>
          <p className="spec">{t('eyebrow')}</p>
          <h1 className="display mt-3 text-[clamp(2.1rem,5.4vw,3.5rem)]">{t('title')}</h1>
          <p className="mt-4 max-w-[42ch] text-[1.0625rem] leading-relaxed text-ink-2">
            {t('lede')}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink href="/designer" variant="primary" size="lg">
              {t('primary')} <ArrowRight size={17} aria-hidden />
            </ButtonLink>
            <ButtonLink href="/furniture" variant="quiet" size="lg">
              {t('secondary')}
            </ButtonLink>
          </div>

          <p className="mt-4 text-[0.8125rem] text-ink-3">{t('note')}</p>
        </div>

        <figure className="lg:-mr-8">
          <HeroSign label={p('label')} />
          <figcaption className="mt-3 text-center text-[0.8125rem] text-ink-3 lg:text-left lg:pl-4">
            {p('caption')}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
