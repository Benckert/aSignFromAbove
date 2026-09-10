'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { customEnquirySchema, type CustomEnquiryInput } from '@/lib/forms/schemas';
import { site } from '@/config/site';
import { Field, inputClass } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Controls';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConsentBlock, Honeypot } from './ConsentBlock';
import { cx } from '@/lib/cx';

/**
 * The enquiry form for one-off work.
 *
 * There is no price anywhere on this page, and that is the point. A dining
 * table for a room with sloping walls cannot be costed from a dropdown, so
 * asking someone to pick a package would either produce a number that is wrong
 * or a form that refuses to submit. Instead this collects enough to have a
 * useful first conversation: what, roughly when, and roughly what budget.
 *
 * The budget field is optional and offered as bands rather than a box, because
 * people are reluctant to name a figure first — and a workshop that knows the
 * band can propose something buildable instead of guessing twice.
 */
export function CustomEnquiryForm() {
  const t = useTranslations('custom');
  const e = useTranslations('errors.form');
  // The name, email and phone fields are worded identically here and on the
  // sign order, so they are read from the one namespace that defines them.
  const o = useTranslations('order');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomEnquiryInput>({
    resolver: zodResolver(customEnquirySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      kind: 'furniture',
      description: '',
      timeframe: 'flexible',
      date: '',
      budget: 'unknown',
      newsletter: false,
      website: '',
      locale: locale === 'en' ? 'en' : 'sv',
    },
    mode: 'onTouched',
  });

  const kind = watch('kind');
  const timeframe = watch('timeframe');
  const budget = watch('budget');
  const consent = watch('consent');
  const newsletter = watch('newsletter');

  async function onSubmit(values: CustomEnquiryInput) {
    setStatus('sending');
    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error();
      setStatus('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-rule bg-surface-2 p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-moss-wash text-moss-deep">
          <Check size={20} aria-hidden />
        </span>
        <h2 className="display mt-5 text-[1.75rem]">{t('success.title')}</h2>
        <p className="prose-workshop mt-3">{t('success.body', { email: watch('email') })}</p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          {o('success.back')}
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Honeypot register={register('website')} />

      <Field label={t('fields.kind')}>
        {() => (
          <Segmented
            label={t('fields.kind')}
            value={kind}
            wrap
            options={(['furniture', 'sign', 'repair', 'other'] as const).map((k) => ({
              value: k,
              label: t(`fields.kinds.${k}`),
            }))}
            onChange={(value) => setValue('kind', value as typeof kind)}
          />
        )}
      </Field>

      <Field
        label={t('fields.description')}
        hint={t('fields.descriptionHint')}
        required
        error={errors.description && e('tooShort')}
      >
        {(props) => (
          <textarea
            {...props}
            {...register('description')}
            rows={7}
            placeholder={t('fields.descriptionPlaceholder')}
            className={cx(inputClass, 'resize-y leading-relaxed')}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('fields.timeframe')}>
          {() => (
            <Segmented
              label={t('fields.timeframe')}
              value={timeframe}
              wrap
              options={(['flexible', 'months', 'date'] as const).map((k) => ({
                value: k,
                label: t(`fields.timeframes.${k}`),
              }))}
              onChange={(value) => setValue('timeframe', value as typeof timeframe)}
            />
          )}
        </Field>

        {timeframe === 'date' && (
          <Field label={t('fields.date')}>
            {(props) => (
              <input {...props} {...register('date')} type="date" className={inputClass} />
            )}
          </Field>
        )}
      </div>

      <Field label={t('fields.budget')} hint={t('fields.budgetHint')}>
        {() => (
          <Segmented
            label={t('fields.budget')}
            value={budget}
            wrap
            options={(['unknown', 'under5', '5to15', '15to40', 'over40'] as const).map((k) => ({
              value: k,
              label: t(`fields.budgetOptions.${k}`),
            }))}
            onChange={(value) => setValue('budget', value as typeof budget)}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={o('fields.name')} required error={errors.name && e('required')}>
          {(props) => (
            <input {...props} {...register('name')} className={inputClass} autoComplete="name" />
          )}
        </Field>
        <Field label={o('fields.email')} required error={errors.email && e('email')}>
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

      <Field label={o('fields.phone')} hint={o('fields.phoneHint')}>
        {(props) => (
          <input {...props} {...register('phone')} type="tel" className={inputClass} autoComplete="tel" />
        )}
      </Field>

      <ConsentBlock
        consent={Boolean(consent)}
        onConsentChange={(v) => setValue('consent', v as true, { shouldValidate: true })}
        newsletter={Boolean(newsletter)}
        onNewsletterChange={(v) => setValue('newsletter', v)}
        error={errors.consent ? 'required' : undefined}
      />

      {status === 'error' && (
        <div role="alert" className="rounded-md border border-rust/40 bg-rust-wash p-4">
          <p className="text-[0.8125rem] leading-relaxed text-ink-2">
            {o('error.body', { email: site.contact.email })}
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={status === 'sending'}
        className="mt-1 sm:self-start"
      >
        {status === 'sending' && <Loader2 size={16} aria-hidden className="animate-spin" />}
        {status === 'sending' ? o('submitting') : t('submit')}
      </Button>
    </form>
  );
}
