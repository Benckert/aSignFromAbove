'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { site } from '@/config/site';
import { Checkbox } from '@/components/ui/Controls';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * The consent controls shared by every form.
 *
 * Two boxes, never one. Bundling "handle my enquiry" together with "send me
 * marketing" is precisely what the GDPR means by consent that is not freely
 * given — so the newsletter box is separate, optional, and only appears at all
 * once the newsletter actually exists.
 *
 * Neither box is pre-ticked.
 *
 * The detail behind each — how long anything is kept, how often anything is
 * sent — sits in a tooltip rather than in grey type under the label. It is
 * still one interaction away and still reachable by a screenreader, but it no
 * longer turns the end of every form into a paragraph of policy.
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
          <Tooltip label={t('detailLabel')}>{t('detail')}</Tooltip>{' '}
          {/* The policy is linked by its name rather than as "here". */}
          <Link
            href="/privacy"
            className="text-[0.75rem] text-oak-deep underline underline-offset-2 transition hover:text-ink"
          >
            {footer('privacy')}
          </Link>
        </Checkbox>
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
            <Tooltip label={t('detailLabel')}>{n('detail')}</Tooltip>
          </Checkbox>
        </div>
      )}
    </div>
  );
}

/**
 * A hidden field that only a bot will fill in.
 *
 * Hidden by clipping to a single pixel rather than by being pushed thousands
 * of pixels off-screen: both are invisible and both are still filled in by
 * form-stuffing bots, but the clipped version does not look like a layout
 * fault to anything measuring the page.
 */
export function Honeypot({ register }: { register: Record<string, unknown> }) {
  return (
    <div
      aria-hidden="true"
      className="absolute h-px w-px overflow-hidden"
      style={{ clipPath: 'inset(50%)' }}
    >
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  );
}
