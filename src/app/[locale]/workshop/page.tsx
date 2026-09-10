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
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{t('title')}</h1>
        <p className="mt-4 text-[1.125rem] leading-relaxed text-ink-2">{t('lede')}</p>
      </header>

      <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="prose-workshop text-[1rem]">
          {body.map((paragraph, i) => (
            <p key={i} className={i === 0 ? '' : 'mt-5'}>
              {paragraph}
            </p>
          ))}

          <p className="mt-8 border-t border-rule pt-6 text-[0.9375rem] text-ink-3">
            — {site.maker.name}
          </p>
        </div>

        <aside>
          <h2 className="spec mb-4">{t('principles.title')}</h2>
          <ul className="flex flex-col gap-5">
            {principles.map((item) => (
              <li key={item.title} className="border-t border-rule pt-4">
                <h3 className="text-[0.9375rem] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">{item.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-2">
            <ButtonLink href="/designer" variant="primary">
              {nav('designer')}
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              {nav('contact')}
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
