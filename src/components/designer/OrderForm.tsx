'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useDesigner } from '@/lib/designer/store';
import { priceSign } from '@/lib/designer/pricing';
import { isOrderable } from '@/lib/designer/constraints';
import { exportSvg, svgToPng } from '@/lib/designer/export';
import { signOrderContactSchema, type SignOrderContactInput } from '@/lib/forms/schemas';
import { site } from '@/config/site';
import { SignPreview } from './SignPreview';
import { PriceCard } from './PriceCard';
import { Field, inputClass } from '@/components/ui/Field';
import { Segmented, Checkbox } from '@/components/ui/Controls';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConsentBlock, Honeypot } from '@/components/forms/ConsentBlock';
import { cx } from '@/lib/cx';

/**
 * The step between drawing a sign and the workshop hearing about it.
 *
 * Deliberately not called a checkout. Nothing is charged here and nothing is
 * committed — the page says so twice, because the single biggest reason people
 * abandon a configurator is not knowing whether the next button bills them.
 *
 * The preview is rendered again here, off-screen, purely so it can be
 * rasterised and attached to the email. The customer's own copy of the drawing
 * lives in their browser, so this page can be reloaded without losing it.
 */
export function OrderForm() {
  const t = useTranslations('order');
  const d = useTranslations('designer');
  const e = useTranslations('errors.form');
  const locale = useLocale();

  const design = useDesigner((s) => s.design);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reference, setReference] = useState<string | null>(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    void useDesigner.persist.rehydrate();
    setHydrated(true);
  }, []);

  const price = priceSign(design);
  const orderable = isOrderable(design);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignOrderContactInput>({
    resolver: zodResolver(signOrderContactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      delivery: 'ship',
      address: '',
      newsletter: false,
      website: '',
      locale: locale === 'en' ? 'en' : 'sv',
    },
    // Validate on blur rather than on every keystroke: telling somebody their
    // email is invalid while they are still typing it is just nagging.
    mode: 'onTouched',
  });

  const delivery = watch('delivery');
  const consent = watch('consent');
  const newsletter = watch('newsletter');
  const withdrawal = watch('withdrawalAcknowledged');

  async function onSubmit(values: SignOrderContactInput) {
    setStatus('sending');

    // Best effort: an order without a picture is still a complete order,
    // because the written specification is the authoritative document.
    let previewPng: string | undefined;
    try {
      if (svgRef.current) {
        const { svg } = await exportSvg(svgRef.current);
        // 1200 px is a generous reference image while keeping the request
        // body well under the 4.5 MB limit common to serverless hosts — a
        // larger sign at 1600 px was pushing 2.3 MB once base64-encoded.
        previewPng = await svgToPng(svg, 1200);
      }
    } catch {
      previewPng = undefined;
    }

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, design, previewPng }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'failed');
      setReference(result.reference);
      setStatus('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="shell max-w-2xl pb-16 pt-10 lg:pb-24 lg:pt-14">
        <div className="rounded-lg border border-rule bg-surface-2 p-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-moss-wash text-moss-deep">
            <Check size={20} aria-hidden />
          </span>
          <h1 className="display mt-5 text-[1.9rem]">{t('success.title')}</h1>
          <p className="prose-workshop mt-3">{t('success.body', { email: watch('email') })}</p>
          {reference && (
            <p className="spec mt-5">
              {t('success.reference')} {reference}
            </p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/" variant="primary">
              {t('success.back')}
            </ButtonLink>
            <ButtonLink href="/designer" variant="secondary">
              {t('success.designAgain')}
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell pb-12 pt-6 lg:pb-16 lg:pt-8">
      <Link
        href="/designer"
        className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 transition hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden /> {t('changeDesign')}
      </Link>

      <header className="mt-5 max-w-2xl">
        <h1 className="display text-[clamp(1.9rem,4vw,2.75rem)]">{t('title')}</h1>
        <p className="prose-workshop mt-3">{t('lede')}</p>
      </header>

      <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-14">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Honeypot register={register('website')} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('fields.name')} required error={errors.name && e('required')}>
              {(props) => (
                <input {...props} {...register('name')} className={inputClass} autoComplete="name" />
              )}
            </Field>

            <Field label={t('fields.email')} required error={errors.email && e('email')}>
              {(props) => (
                <input
                  {...props}
                  {...register('email')}
                  type="email"
                  className={inputClass}
                  autoComplete="email"
                  inputMode="email"
                />
              )}
            </Field>
          </div>

          <Field label={t('fields.phone')} hint={t('fields.phoneHint')}>
            {(props) => (
              <input
                {...props}
                {...register('phone')}
                type="tel"
                className={inputClass}
                autoComplete="tel"
              />
            )}
          </Field>

          <Field label={t('fields.delivery')}>
            {() => (
              <Segmented
                label={t('fields.delivery')}
                value={delivery}
                options={[
                  { value: 'ship', label: t('fields.deliveryShip') },
                  { value: 'pickup', label: t('fields.deliveryPickup') },
                ]}
                onChange={(value) => setValue('delivery', value as 'ship' | 'pickup')}
              />
            )}
          </Field>

          {delivery === 'ship' && (
            <Field label={t('fields.address')}>
              {(props) => (
                <textarea
                  {...props}
                  {...register('address')}
                  rows={3}
                  className={cx(inputClass, 'resize-y')}
                  autoComplete="street-address"
                />
              )}
            </Field>
          )}

          <Field label={t('fields.message')} hint={t('fields.messageHint')}>
            {(props) => (
              <textarea
                {...props}
                {...register('message')}
                rows={4}
                className={cx(inputClass, 'resize-y')}
              />
            )}
          </Field>

          {/*
            The withdrawal-right exemption, stated before the order goes and
            acknowledged separately rather than buried in the terms.

            The statute behind it now sits behind a toggle. Consent still has
            to be informed, so the sentence that carries the actual meaning is
            always visible and the full explanation is one click away and
            always in the DOM — what is folded is the detail, not the point.

            Dressed the same as the consent box below it rather than in the
            accent wash it used to wear. Two acknowledgements asked at the same
            moment should look like two of the same thing; painting one of them
            amber made it the loudest element on a page whose actual subject is
            the sign.
          */}
          <div className="rounded-md border border-rule bg-surface-2 p-4">
            <Checkbox
              checked={Boolean(withdrawal)}
              onChange={(v) => setValue('withdrawalAcknowledged', v as true, { shouldValidate: true })}
              invalid={Boolean(errors.withdrawalAcknowledged)}
            >
              {t('withdrawal.acknowledge')}
            </Checkbox>

            <button
              type="button"
              onClick={() => setWithdrawalOpen((v) => !v)}
              aria-expanded={withdrawalOpen}
              aria-controls="withdrawal-detail"
              className="mt-2 ml-6.5 inline-flex items-center gap-1 text-[0.75rem] text-oak-deep transition hover:text-ink"
            >
              {t('withdrawal.more')}
              <ChevronDown
                size={12}
                aria-hidden
                className={cx('transition-transform', withdrawalOpen && 'rotate-180')}
              />
            </button>

            <p
              id="withdrawal-detail"
              hidden={!withdrawalOpen}
              className="ml-6.5 mt-2 text-[0.75rem] leading-relaxed text-ink-2"
            >
              {t('withdrawal.body')}
            </p>
          </div>

          <ConsentBlock
            consent={Boolean(consent)}
            onConsentChange={(v) => setValue('consent', v as true, { shouldValidate: true })}
            newsletter={Boolean(newsletter)}
            onNewsletterChange={(v) => setValue('newsletter', v)}
            error={errors.consent ? 'required' : undefined}
          />

          {status === 'error' && (
            <div role="alert" className="rounded-md border border-rust/40 bg-rust-wash p-4">
              <h2 className="text-[0.9375rem] font-semibold text-ink">{t('error.title')}</h2>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">
                {t('error.body', { email: site.contact.email })}
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={status === 'sending' || !orderable}
            className="mt-1 mb-8 sm:self-start"
          >
            {status === 'sending' && <Loader2 size={16} aria-hidden className="animate-spin" />}
            {status === 'sending' ? t('submitting') : t('submit')}
          </Button>
        </form>

        {/* What they are about to send. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <h2 className="label">{t('summary')}</h2>
          <div className="rounded-lg border border-rule bg-surface-2 p-4">
            {hydrated && (
              <SignPreview
                design={design}
                svgRef={svgRef}
                label={d('preview.label')}
                className="h-auto w-full"
              />
            )}
          </div>
          <PriceCard price={price} />
        </aside>
      </div>
    </div>
  );
}
