'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { formatOre, type PriceBreakdown } from '@/lib/sign/pricing';
import { site } from '@/config/site';
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
  const [open, setOpen] = useState(false);

  const rows = [
    { label: t('material'), value: price.materialOre },
    { label: t('setup'), value: price.setupOre },
    {
      label: t('carving'),
      value: price.carveOre,
      note: t('machineTime', { minutes: Math.round(price.carveMinutes) }),
    },
    { label: t('finishing'), value: price.finishingOre },
    ...(price.extrasOre > 0 ? [{ label: t('extras'), value: price.extrasOre }] : []),
  ];

  return (
    <div
      className={cx('border-rule-strong bg-surface-2 rounded-md border', compact ? 'p-3' : 'p-4')}
    >
      <div className="flex items-end justify-between gap-3">
        <span className="label">{t('total')}</span>
        <span className="text-right">
          <span className="display text-ink block text-[1.75rem] leading-none">
            {formatOre(price.totalOre)}
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
            className="border-rule text-ink-2 hover:text-ink mt-3 flex w-full items-center justify-between gap-2 border-t pt-3 text-[0.8125rem] transition"
          >
            {open ? t('hideBreakdown') : t('breakdown')}
            <ChevronDown size={14} aria-hidden className={cx('transition', open && 'rotate-180')} />
          </button>

          {open && (
            <dl className="mt-2 flex flex-col gap-1.5 text-[0.8125rem]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">
                    {row.label}
                    {row.note && <span className="spec ml-2 normal-case">{row.note}</span>}
                  </dt>
                  <dd className="text-ink shrink-0 font-mono text-[0.75rem]">
                    {formatOre(row.value)}
                  </dd>
                </div>
              ))}

              {price.minimumApplied && (
                <p className="text-oak-deep mt-1 text-[0.75rem]">{t('minimum')}</p>
              )}

              <div className="border-rule mt-1.5 flex items-baseline justify-between gap-3 border-t pt-1.5">
                <dt className="text-ink-2">{t('subtotal')}</dt>
                <dd className="text-ink shrink-0 font-mono text-[0.75rem]">
                  {formatOre(price.subtotalOre)}
                </dd>
              </div>
              {site.legal.vatRegistered && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">{t('vat')}</dt>
                  <dd className="text-ink shrink-0 font-mono text-[0.75rem]">
                    {formatOre(price.vatOre)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <p className="border-rule text-ink-3 mt-3 border-t pt-3 text-[0.75rem] leading-relaxed">
            {t('fixed')}{' '}
            {t('leadTime', { min: site.leadTimeWeeks.min, max: site.leadTimeWeeks.max })}
          </p>
        </>
      )}
    </div>
  );
}
