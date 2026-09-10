import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { HeroSign } from './HeroSign';

/**
 * The front page opens on the thing the site is for.
 *
 * What used to sit above the headline was a small uppercase monospaced label
 * reading "sign carving and furniture making" — the kind of thing that appears
 * on every template built in the last five years and tells a reader nothing the
 * headline underneath does not. It is gone, along with the four numbered steps
 * that followed: what those four boxes were really saying is one sentence, so
 * it is now one sentence.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const p = useTranslations('home.livePreview');

  return (
    <section className="border-b border-rule">
      <div className="shell grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:py-20">
        <div>
          <h1 className="display text-[clamp(2.1rem,5.4vw,3.5rem)]">{t('title')}</h1>
          <p className="mt-5 max-w-[40ch] text-[1.0625rem] leading-relaxed text-ink-2">
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

          {/* The whole "how it works" section, said properly and once. */}
          <p className="mt-8 max-w-[44ch] border-t border-rule pt-5 text-[0.9375rem] leading-relaxed text-ink-3">
            {t('process')}
          </p>
        </div>

        <div className="lg:-mr-6">
          <HeroSign label={p('label')} />
        </div>
      </div>
    </section>
  );
}
