'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import type { CarveMethod } from '@/lib/designer/types';
import { cx } from '@/lib/cx';

/**
 * The face picker.
 *
 * Each option is set in its own face, so the customer chooses by looking rather
 * than by reading a name they do not recognise. Beside each is how well it
 * takes the cutting method currently selected — which changes as they change
 * the method, because a face that is ideal V-carved can be a poor idea pocketed.
 */

const RATING_STYLE = {
  excellent: 'bg-moss-wash text-moss-deep',
  good: 'bg-surface-3 text-ink-2',
  caution: 'bg-rust-wash text-rust',
} as const;

export function FontPicker({
  value,
  method,
  onChange,
  label,
}: {
  value: string;
  method: CarveMethod;
  onChange: (id: string) => void;
  label: string;
}) {
  const t = useTranslations('designer.text');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const selected = getFont(value);

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
        {CARVING_FONTS.map((font) => {
          const active = font.id === value;
          const rating = font.suitability[method];
          return (
            <button
              key={font.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(font.id)}
              className={cx(
                'flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition',
                'duration-150 ease-[var(--ease-wood)]',
                active
                  ? 'border-ink bg-surface ring-1 ring-ink'
                  : 'border-rule hover:border-rule-strong hover:bg-surface-2',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[1.25rem] leading-tight text-ink"
                  style={{ fontFamily: font.cssFamily }}
                >
                  {font.capsOnly ? font.label.toUpperCase() : font.label}
                </span>
                <span className="mt-0.5 block text-[0.75rem] text-ink-3">
                  {t('minSize', { mm: font.minCapHeightMm })}
                </span>
              </span>
              <span
                className={cx(
                  'shrink-0 rounded-sm px-1.5 py-1 font-mono text-[0.625rem] uppercase tracking-wider',
                  RATING_STYLE[rating],
                )}
              >
                {t(`suitability.${rating}`)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-3">{selected.note[locale]}</p>
    </div>
  );
}
