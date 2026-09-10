'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { formatOre } from '@/lib/designer/pricing';
import { site } from '@/config/site';
import type { PriceBreakdown } from '@/lib/designer/types';
import { cx } from '@/lib/cx';

/**
 * The price.
 *
 * Shown inclusive of VAT, which the Swedish Price Information Act requires for
 * a price presented to a consumer. The figure excluding VAT is available too,
 * clearly labelled, because business customers need it.
 *
 * The working is there for anyone who wants it, folded away by default. Being
 * able to see that a walnut board costs what it costs — and that the machine
 * time is a real estimate rather than a markup — is what makes a fixed price
 * from a one-person workshop believable.
 */
export function PriceCard({ price, compact }: { price: PriceBreakdown; compact?: boolean }) {
  const t = useTranslations('designer.price');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const rows = [
    { label: t('material'), value: price.materialOre },
    { label: t('setup'), value: price.setupOre },
    { label: t('carving'), value: price.carveOre, note: t('machineTime', { minutes: Math.round(price.carveMinutes) }) },
    { label: t('finishing'), value: price.finishingOre },
    ...(price.extrasOre > 0 ? [{ label: t('extras'), value: price.extrasOre }] : []),
  ];

  return (
    <div className={cx('rounded-md border border-rule-strong bg-surface-2', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-end justify-between gap-3">
        <span className="label">{t('total')}</span>
        <span className="text-right">
          <span className="display block text-[1.75rem] leading-none text-ink">
            {formatOre(price.totalOre, locale)}
          </span>
          <span className="spec mt-1 block">
            {site.legal.vatRegistered ? t('incVat') : t('exVat')}
          </span>
        </span>
      </div>

      {!compact && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex w-full items-center justify-between gap-2 border-t border-rule pt-3 text-[0.8125rem] text-ink-2 transition hover:text-ink"
          >
            {open ? t('hideBreakdown') : t('breakdown')}
            <ChevronDown
              size={14}
              aria-hidden
              className={cx('transition', open && 'rotate-180')}
            />
          </button>

          {open && (
            <dl className="mt-2 flex flex-col gap-1.5 text-[0.8125rem]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">
                    {row.label}
                    {row.note && <span className="spec ml-2 normal-case">{row.note}</span>}
                  </dt>
                  <dd className="shrink-0 font-mono text-[0.75rem] text-ink">
                    {formatOre(row.value, locale)}
                  </dd>
                </div>
              ))}

              {price.minimumApplied && (
                <p className="mt-1 text-[0.75rem] text-oak-deep">{t('minimum')}</p>
              )}

              <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-rule pt-1.5">
                <dt className="text-ink-2">{t('subtotal')}</dt>
                <dd className="shrink-0 font-mono text-[0.75rem] text-ink">
                  {formatOre(price.subtotalOre, locale)}
                </dd>
              </div>
              {site.legal.vatRegistered && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">{t('vat')}</dt>
                  <dd className="shrink-0 font-mono text-[0.75rem] text-ink">
                    {formatOre(price.vatOre, locale)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <p className="mt-3 border-t border-rule pt-3 text-[0.75rem] leading-relaxed text-ink-3">
            {t('fixed')}{' '}
            {t('leadTime', { min: site.leadTimeWeeks.min, max: site.leadTimeWeeks.max })}
          </p>
        </>
      )}
    </div>
  );
}
