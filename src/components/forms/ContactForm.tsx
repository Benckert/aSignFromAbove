'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { contactSchema, type ContactInput } from '@/lib/forms/schemas';
import { site } from '@/config/site';
import { Field, inputClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ConsentBlock, Honeypot } from './ConsentBlock';
import { cx } from '@/lib/cx';

export function ContactForm() {
  const t = useTranslations('contact.form');
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
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      newsletter: false,
      website: '',
      locale: locale === 'en' ? 'en' : 'sv',
    },
    mode: 'onTouched',
  });

  const consent = watch('consent');
  const newsletter = watch('newsletter');

  async function onSubmit(values: ContactInput) {
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-rule bg-surface-2 p-6">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-moss-wash text-moss-deep">
          <Check size={18} aria-hidden />
        </span>
        <h3 className="display mt-4 text-[1.375rem]">{o('success.title')}</h3>
        <p className="prose-workshop mt-2 text-[0.9375rem]">
          {o('success.body', { email: watch('email') })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Honeypot register={register('website')} />

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

      <Field label={t('subject')} required error={errors.subject && e('required')}>
        {(props) => <input {...props} {...register('subject')} className={inputClass} />}
      </Field>

      <Field label={t('message')} required error={errors.message && e('tooShort')}>
        {(props) => (
          <textarea
            {...props}
            {...register('message')}
            rows={6}
            className={cx(inputClass, 'resize-y leading-relaxed')}
          />
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
        className="sm:self-start"
      >
        {status === 'sending' && <Loader2 size={16} aria-hidden className="animate-spin" />}
        {status === 'sending' ? o('submitting') : t('submit')}
      </Button>
    </form>
  );
}
