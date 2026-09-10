'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Ban, Info, Check } from 'lucide-react';
import type { DesignWarning } from '@/lib/designer/types';
import { cx } from '@/lib/cx';

/**
 * What the workshop would tell you across the bench.
 *
 * Ordered hardest-first, so the thing that actually stops the order is at the
 * top. A design with nothing wrong says so explicitly rather than showing an
 * empty space — silence reads as "the tool did not check".
 */

const ORDER = { blocking: 0, warning: 1, note: 2 } as const;

const STYLE = {
  blocking: { box: 'border-rust/35 bg-rust-wash', icon: 'text-rust', Icon: Ban },
  warning: { box: 'border-oak/35 bg-oak-wash', icon: 'text-oak-deep', Icon: AlertTriangle },
  note: { box: 'border-rule bg-surface-2', icon: 'text-ink-3', Icon: Info },
} as const;

export function WarningList({ warnings }: { warnings: DesignWarning[] }) {
  const t = useTranslations('designer.warnings');
  const locale = useLocale() === 'en' ? 'en' : 'sv';

  if (warnings.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-rule bg-moss-wash px-3.5 py-3 text-[0.8125rem] leading-relaxed text-moss-deep">
        <Check size={15} aria-hidden className="mt-0.5 shrink-0" />
        {t('none')}
      </p>
    );
  }

  const sorted = [...warnings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {sorted.map((warning) => {
        const style = STYLE[warning.severity];
        return (
          <li
            key={warning.id}
            className={cx('flex gap-2.5 rounded-md border px-3.5 py-3', style.box)}
          >
            <style.Icon size={15} aria-hidden className={cx('mt-0.5 shrink-0', style.icon)} />
            <span className="min-w-0">
              <span className={cx('block text-[0.75rem] font-semibold', style.icon)}>
                {t(warning.severity)}
              </span>
              <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-2">
                {warning.message[locale]}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
