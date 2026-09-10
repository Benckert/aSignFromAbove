import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

/**
 * The one thing to do if a sign is not what you came for.
 *
 * This replaces a three-column block of links to furniture, custom work and
 * the workshop. Three equal doors is not a choice, it is a shrug — and the
 * header already carries all three. What was missing was a plain invitation to
 * talk to someone, which is the actual next step for anything the designer
 * cannot make.
 */
export function CallToAction() {
  const t = useTranslations('home.cta');

  return (
    <section className="shell pb-16 pt-4 lg:pb-24">
      <div className="relative overflow-hidden rounded-lg border border-rule bg-surface-2 px-6 py-10 shadow-sheet sm:px-10 lg:py-14">
        {/* A slow wash of oak light across the panel, so the block has some
            depth rather than being a flat rectangle of a different colour. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-oak) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-[46ch]">
          <h2 className="display text-[clamp(1.6rem,3vw,2.25rem)]">{t('title')}</h2>
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">{t('body')}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="primary" size="lg">
              {t('button')} <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <ButtonLink href="/furniture" variant="secondary" size="lg">
              {t('secondary')}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
