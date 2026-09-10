'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PIECES, PIECE_KINDS, type Piece, type PieceKind } from '@/content/furniture';
import { getWood } from '@/config/woods';
import { PieceImage } from './PieceImage';
import { PieceDialog } from './PieceDialog';
import { cx } from '@/lib/cx';

/**
 * The furniture gallery.
 *
 * Filtering is client-side over a handful of entries, which is the right
 * trade at this size: no round trip, no loading state, and the filter still
 * works if a piece is added tomorrow. The filter row hides itself entirely when
 * there is only one kind of thing to look at, rather than showing a control
 * that does nothing.
 */
export function Gallery() {
  const t = useTranslations('furniture');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const [kind, setKind] = useState<PieceKind | 'all'>('all');
  const [open, setOpen] = useState<Piece | null>(null);

  const kinds = useMemo(
    () => PIECE_KINDS.filter((k) => PIECES.some((p) => p.kind === k)),
    [],
  );
  const shown = useMemo(
    () => (kind === 'all' ? PIECES : PIECES.filter((p) => p.kind === kind)),
    [kind],
  );

  if (PIECES.length === 0) {
    return <p className="prose-workshop">{t('empty')}</p>;
  }

  return (
    <>
      {kinds.length > 1 && (
        <div className="no-scrollbar edge-fade -mx-5 mb-8 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <FilterChip active={kind === 'all'} onClick={() => setKind('all')}>
            {t('filterAll')}
          </FilterChip>
          {kinds.map((k) => (
            <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
              {t(`kinds.${k}`)}
            </FilterChip>
          ))}
        </div>
      )}

      <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((piece, i) => (
          <li key={piece.id}>
            <button
              type="button"
              onClick={() => setOpen(piece)}
              className="group w-full text-left"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-rule">
                <PieceImage
                  piece={piece}
                  label={t('placeholder')}
                  priority={i < 3}
                  className="transition duration-500 ease-[var(--ease-wood)] group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-[1.0625rem] font-medium text-ink group-hover:text-oak-deep">
                  {piece.title[locale]}
                </span>
                <span className="spec shrink-0">{piece.year}</span>
              </span>
              <span className="mt-1 block text-[0.875rem] text-ink-3">
                {piece.woods.map((w) => getWood(w).name[locale]).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <PieceDialog piece={open} onClose={() => setOpen(null)} />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-sm border px-3.5 py-2 text-[0.875rem] transition',
        active
          ? 'border-ink bg-ink text-surface'
          : 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
