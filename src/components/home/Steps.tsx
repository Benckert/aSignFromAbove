import { useTranslations } from 'next-intl';

interface Step {
  n: string;
  title: string;
  body: string;
}

/**
 * Four short steps whose real job is to say that nothing is charged until both
 * sides have agreed. Kept to one line each — a visitor who wants the detail is
 * already in the design tool finding it out for themselves.
 */
export function Steps() {
  const t = useTranslations('home.how');
  const steps = t.raw('steps') as Step[];

  return (
    <section className="border-b border-rule py-12 lg:py-16">
      <div className="shell">
        <h2 className="spec">{t('title')}</h2>
        <ol className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n}>
              <h3 className="text-[0.9375rem] font-medium text-ink">
                <span className="mr-2 font-mono text-[0.75rem] text-ink-3">{step.n}</span>
                {step.title}
              </h3>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-3">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
