'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { site } from '@/config/site';
import { Checkbox } from '@/components/ui/Controls';

/**
 * The consent controls shared by every form.
 *
 * Two boxes, never one. Bundling "handle my enquiry" together with "send me
 * marketing" is precisely what the GDPR means by consent that is not freely
 * given — so the newsletter box is separate, optional, and only appears at all
 * once the newsletter actually exists.
 *
 * Neither box is pre-ticked.
 */
export function ConsentBlock({
  consent,
  onConsentChange,
  newsletter,
  onNewsletterChange,
  error,
}: {
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  newsletter: boolean;
  onNewsletterChange: (value: boolean) => void;
  error?: string;
}) {
  const t = useTranslations('order.consent');
  const n = useTranslations('order.newsletter');
  const footer = useTranslations('footer');

  return (
    <div className="flex flex-col gap-3 rounded-md border border-rule bg-surface-2 p-4">
      <div>
        <Checkbox checked={consent} onChange={onConsentChange} invalid={Boolean(error)}>
          {t('label')}
        </Checkbox>
        <p className="mt-1.5 pl-6.5 text-[0.75rem] leading-relaxed text-ink-3">
          {t('detail')}{' '}
          {/* Linked by its name rather than as "here", so it reads on its own. */}
          <Link
            href="/privacy"
            className="text-oak-deep underline underline-offset-2 transition hover:text-ink"
          >
            {footer('privacy')}
          </Link>
        </p>
        {error && (
          <p role="alert" className="mt-1.5 pl-6.5 text-[0.75rem] text-rust">
            {t('required')}
          </p>
        )}
      </div>

      {site.features.newsletter && (
        <div className="border-t border-rule pt-3">
          <Checkbox checked={newsletter} onChange={onNewsletterChange}>
            {n('label')}
          </Checkbox>
          <p className="mt-1.5 pl-6.5 text-[0.75rem] leading-relaxed text-ink-3">{n('detail')}</p>
        </div>
      )}
    </div>
  );
}

/** A hidden field that only a bot will fill in. */
export function Honeypot({ register }: { register: Record<string, unknown> }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  );
}
