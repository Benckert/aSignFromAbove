'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getWood } from '@/config/woods';
import type { Piece } from '@/content/furniture';
import { PieceImage } from './PieceImage';
import { ButtonLink } from '@/components/ui/Button';

/**
 * The detail view for one piece.
 *
 * Built on the native <dialog> element rather than a hand-rolled overlay, which
 * means the browser handles the focus trap, the backdrop, the top layer and
 * Escape — four things that are easy to get subtly wrong by hand and that
 * matter to anyone navigating by keyboard.
 */
export function PieceDialog({ piece, onClose }: { piece: Piece | null; onClose: () => void }) {
  const t = useTranslations('furniture');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (piece && !dialog.open) dialog.showModal();
    if (!piece && dialog.open) dialog.close();
  }, [piece]);

  // Stop the page behind from scrolling while the dialog is up.
  useEffect(() => {
    if (!piece) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [piece]);

  const size = piece
    ? [piece.sizeMm.w, piece.sizeMm.d, piece.sizeMm.h].filter(Boolean).join(' × ') + ' mm'
    : '';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click that lands on the dialog element itself is a click on the
      // backdrop, since the content sits in a child element.
      onClick={(e) => e.target === ref.current && onClose()}
      className="max-h-[90dvh] w-[min(56rem,92vw)] rounded-lg border border-rule bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {piece && (
        <div className="max-h-[90dvh] overflow-y-auto">
          <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-rule">
            <PieceImage piece={piece} label={t('placeholder')} />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-sm border border-rule bg-surface/85 text-ink backdrop-blur-sm transition hover:bg-surface"
            >
              <span className="sr-only">{t('close')}</span>
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <h2 className="display text-[1.75rem]">{piece.title[locale]}</h2>
              <p className="prose-workshop mt-4 text-[0.9375rem]">{piece.story[locale]}</p>
              {piece.images.length === 0 && (
                <p className="mt-5 text-[0.8125rem] text-ink-3">{t('placeholderHint')}</p>
              )}
            </div>

            <dl className="flex flex-col gap-3 border-t border-rule pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Detail label={t('details.wood')}>
                {piece.woods.map((w) => getWood(w).name[locale]).join(', ')}
              </Detail>
              <Detail label={t('details.year')}>{piece.year}</Detail>
              <Detail label={t('details.size')}>{size}</Detail>
              <Detail label={t('details.finish')}>{piece.finish[locale]}</Detail>
              <Detail label={t('details.forWhom')}>{piece.forWhom[locale]}</Detail>
            </dl>
          </div>

          <div className="border-t border-rule bg-surface-2 p-6 sm:p-8">
            <h3 className="text-[1.0625rem] font-semibold text-ink">{t('cta.title')}</h3>
            <p className="prose-workshop mt-2 text-[0.9375rem]">{t('cta.body')}</p>
            <ButtonLink href="/custom" variant="primary" className="mt-4">
              {t('cta.button')}
            </ButtonLink>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="spec">{label}</dt>
      <dd className="mt-0.5 text-[0.9375rem] text-ink">{children}</dd>
    </div>
  );
}
