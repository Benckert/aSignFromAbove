import { useTranslations } from 'next-intl';
import { ArrowRight, Mail } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { IconLink } from '@/components/ui/IconLink';
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
 *
 * The third action in the row is a symbol rather than a third worded button.
 * There was a full-width panel further down the page inviting people to get in
 * touch; it took a screen to say what an envelope says here, next to the
 * buttons someone is already looking at.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const p = useTranslations('home.livePreview');

  return (
    <section>
      <div className="shell grid items-center gap-10 pb-14 pt-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:pb-20 lg:pt-12">
        <div>
          <h1 className="display text-balance text-[clamp(2.2rem,5.6vw,3.75rem)]">{t('title')}</h1>
          <p className="mt-5 max-w-[38ch] text-[1.125rem] leading-relaxed text-ink-2">
            {t('lede')}
          </p>

          {/* The primary action takes the full width of a phone; the other two
              share the line beneath it. Left to wrap on their own the three of
              them broke two-and-one, which reads as a mistake. */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink
              href="/designer"
              variant="primary"
              size="lg"
              className="max-sm:w-full max-sm:justify-center"
            >
              {t('primary')} <ArrowRight size={17} aria-hidden />
            </ButtonLink>
            <ButtonLink href="/furniture" variant="quiet" size="lg">
              {t('secondary')}
            </ButtonLink>
            <IconLink href="/contact" label={t('contact')}>
              <Mail size={18} aria-hidden />
            </IconLink>
          </div>

          {/* The whole "how it works" section, said properly and once. */}
          <p className="mt-8 max-w-[44ch] border-t border-rule pt-5 text-[0.9375rem] leading-relaxed text-ink-3">
            {t('process')}
          </p>
        </div>

        {/*
          The sign gets a bench to stand on.

          On its own against the page it read as an illustration dropped onto a
          background. Inside a lit recess — a raised panel, a pool of warm light
          behind the board, a shadow underneath — it reads as an object
          photographed on a workbench, which is the thing being sold.
        */}
        <div className="relative overflow-hidden rounded-lg border border-rule bg-surface-2 p-4 shadow-lift sm:p-7">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(85% 65% at 50% 38%, color-mix(in oklab, var(--color-oak) 15%, transparent) 0%, transparent 68%)',
            }}
          />
          <div className="relative">
            <HeroSign label={p('label')} />
          </div>
        </div>
      </div>
    </section>
  );
}
