import { useTranslations } from 'next-intl';

interface Step {
  n: string;
  title: string;
  body: string;
}

/**
 * How it works.
 *
 * Four steps, laid out so the reader can see there is no payment gate anywhere
 * in them. The point of this section is not to explain a process — it is to
 * remove the worry that clicking into the design tool commits you to something.
 */
export function Steps() {
  const t = useTranslations('home.how');
  const steps = t.raw('steps') as Step[];

  return (
    <section className="border-b border-rule py-16 lg:py-24">
      <div className="shell">
        <div className="max-w-xl">
          <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">{t('title')}</h2>
          <p className="prose-workshop mt-3">{t('lede')}</p>
        </div>

        <ol className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="relative border-t border-rule pt-5">
              <span className="spec">{step.n}</span>
              <h3 className="mt-2 text-[1.0625rem] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
