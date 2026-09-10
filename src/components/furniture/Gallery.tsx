'use client';

import { useLocale, useTranslations } from 'next-intl';
import { PIECES } from '@/content/furniture';
import { getWood } from '@/config/woods';
import { PieceImage } from './PieceImage';

/**
 * The furniture gallery.
 *
 * A plain grid. There were filter chips and a modal detail view here; with six
 * pieces both were apparatus around content that fits on one screen — a filter
 * that never has much to filter, and a click that opens what could simply have
 * been shown. Everything a piece has to say is now on its card.
 */
export function Gallery() {
  const t = useTranslations('furniture');
  const locale = useLocale() === 'en' ? 'en' : 'sv';

  if (PIECES.length === 0) {
    return <p className="prose-workshop">{t('empty')}</p>;
  }

  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
      {PIECES.map((piece, i) => (
        <li key={piece.id}>
          <span className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-rule">
            <PieceImage piece={piece} label={t('placeholder')} priority={i < 2} />
          </span>

          <div className="mt-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[1.0625rem] font-medium text-ink">{piece.title[locale]}</h2>
            <span className="spec shrink-0">{piece.year}</span>
          </div>

          <p className="mt-1 text-[0.8125rem] text-ink-3">
            {piece.woods.map((w) => getWood(w).name[locale]).join(' · ')}
            {piece.sizeMm.w ? ` · ${[piece.sizeMm.w, piece.sizeMm.d, piece.sizeMm.h].filter(Boolean).join('×')} mm` : ''}
          </p>

          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">{piece.story[locale]}</p>
        </li>
      ))}
    </ul>
  );
}
