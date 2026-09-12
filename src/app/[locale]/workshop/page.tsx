import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { site } from '@/config/site';
import { ButtonLink } from '@/components/ui/Button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'workshop' });
  return { title: t('title'), description: t('lede') };
}

export default async function WorkshopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'workshop' });
  const nav = await getTranslations({ locale, namespace: 'nav' });

  const body = t.raw('body') as string[];
  const principles = t.raw('principles.items') as Array<{ title: string; body: string }>;

  return (
    <div className="shell pb-14 pt-7 lg:pb-20 lg:pt-10">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{t('title')}</h1>
        <p className="mt-4 text-[1.125rem] leading-relaxed text-ink-2">{t('lede')}</p>
      </header>

      {/*
        Two columns that actually relate to each other.

        The prose is capped at 58 characters — the measure it reads best at —
        so leaving its track free to grow opened a gutter of dead space between
        the last word of a line and the column beside it, which is what made
        the page look unbalanced. Capping the whole grid at the width the two
        columns genuinely need closes it. The rule across the top gives them a
        shared baseline to hang from, in place of the aside's own rules
        starting at a height nothing on the left matched.
      */}
      <div className="mt-9 max-w-[62rem] border-t border-rule pt-9 lg:mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        <div>
          <div className="prose-workshop text-[1.0625rem]">
            {body.map((paragraph, i) => (
              <p key={i} className={i === 0 ? '' : 'mt-5'}>
                {paragraph}
              </p>
            ))}
          </div>

          <p className="display mt-7 text-[1.0625rem] text-ink-2">— {site.maker.name}</p>

          {/* Where the reading ends is where the next step belongs. */}
          <div className="mt-8 flex flex-wrap gap-2">
            <ButtonLink href="/designer" variant="primary">
              {nav('designer')}
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              {nav('contact')}
            </ButtonLink>
          </div>
        </div>

        <aside className="mt-12 lg:mt-0">
          <h2 className="label">{t('principles.title')}</h2>
          <ul className="mt-4 flex flex-col divide-y divide-rule border-y border-rule">
            {principles.map((item) => (
              <li key={item.title} className="py-4">
                <h3 className="text-[0.9375rem] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">{item.body}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
