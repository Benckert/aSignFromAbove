import { useLocale, useTranslations } from 'next-intl';
import { WOODS } from '@/config/woods';
import { ButtonLink } from '@/components/ui/Button';

/**
 * The timbers, shown as what they are rather than described.
 *
 * Each swatch is painted with the same colours the live preview uses, so the
 * front page and the design tool cannot drift apart: adding a species to the
 * catalogue adds it here.
 */
export function Timbers() {
  const t = useTranslations('home.materials');
  const locale = useLocale() === 'en' ? 'en' : 'sv';

  return (
    <section className="border-b border-rule py-16 lg:py-24">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <p className="spec">{t('eyebrow')}</p>
          <h2 className="display mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)]">{t('title')}</h2>
          <p className="prose-workshop mt-4">{t('lede')}</p>
          <ButtonLink href="/designer" variant="secondary" className="mt-6">
            {t('cta')}
          </ButtonLink>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {WOODS.map((wood) => (
            <li key={wood.id} className="overflow-hidden rounded-md border border-rule">
              <span
                className="block h-20 w-full"
                style={{
                  background: `repeating-linear-gradient(93deg, ${wood.colour.base} 0 7px, ${wood.colour.dark} 7px 9px, ${wood.colour.light} 9px 13px)`,
                }}
                aria-hidden="true"
              />
              <span className="block bg-surface-2 px-3 py-2.5">
                <span className="block text-[0.875rem] font-medium text-ink">
                  {wood.name[locale]}
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] italic text-ink-3">{wood.latin}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
