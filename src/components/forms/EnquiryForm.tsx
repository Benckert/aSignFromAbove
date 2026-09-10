'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { enquirySchema, type EnquiryInput } from '@/lib/forms/schemas';
import { site } from '@/config/site';
import { Field, inputClass } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Controls';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConsentBlock, Honeypot } from './ConsentBlock';
import { cx } from '@/lib/cx';

/**
 * The one form for everything that is not a sign from the designer.
 *
 * There is no price anywhere on it, and no budget field either. A dining table
 * for a room with sloping walls cannot be costed from a dropdown, and asking
 * someone to name a figure before they have been told what things cost puts
 * the awkward half of the conversation first. The workshop reads the
 * description and proposes something instead.
 *
 * The date only appears for the timeframe that has one. Asking "which date?"
 * of somebody who just said "no hurry" is the kind of small rudeness forms are
 * full of.
 */
export function EnquiryForm() {
  const t = useTranslations('enquiry');
  const o = useTranslations('order');
  const e = useTranslations('errors.form');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      kind: 'furniture',
      description: '',
      timeframe: 'flexible',
      date: '',
      newsletter: false,
      website: '',
      locale: locale === 'en' ? 'en' : 'sv',
    },
    mode: 'onTouched',
  });

  const kind = watch('kind');
  const timeframe = watch('timeframe');
  const consent = watch('consent');
  const newsletter = watch('newsletter');

  // "Something else" covers questions as often as projects, and a question has
  // no delivery date.
  const wantsTimeframe = kind !== 'other';

  async function onSubmit(values: EnquiryInput) {
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
      <div className="rounded-lg border border-rule bg-surface-2 p-7 shadow-sheet">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-moss-wash text-moss-deep">
          <Check size={20} aria-hidden />
        </span>
        <h2 className="display mt-5 text-[1.6rem]">{t('success.title')}</h2>
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
            options={(['furniture', 'sign', 'other'] as const).map((k) => ({
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
            rows={6}
            placeholder={t('fields.descriptionPlaceholder')}
            className={cx(inputClass, 'resize-y leading-relaxed')}
          />
        )}
      </Field>

      {wantsTimeframe && (
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
            <Field label={t('fields.date')} required error={errors.date && e('required')}>
              {(props) => (
                <input {...props} {...register('date')} type="date" className={inputClass} />
              )}
            </Field>
          )}
        </div>
      )}

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

      <Field label={o('fields.phone')}>
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
