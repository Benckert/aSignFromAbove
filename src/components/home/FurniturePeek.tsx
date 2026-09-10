import { useLocale, useTranslations } from 'next-intl';
import { PIECES } from '@/content/furniture';
import { PieceImage } from '@/components/furniture/PieceImage';
import { Link } from '@/i18n/navigation';

/**
 * Three pieces from the gallery, as a taste rather than a catalogue.
 *
 * Reads from the same content file the gallery does, so it can never show a
 * piece that has been removed or miss one that has been added.
 */
export function FurniturePeek() {
  const t = useTranslations('furniture');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const pieces = PIECES.slice(0, 3);

  if (pieces.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4">
      {pieces.map((piece, i) => (
        <li key={piece.id} className={i === 0 ? 'col-span-2' : ''}>
          <Link href="/furniture" className="group block">
            <span
              className={
                'relative block overflow-hidden rounded-lg border border-rule ' +
                (i === 0 ? 'aspect-[16/9]' : 'aspect-square')
              }
            >
              <PieceImage
                piece={piece}
                label={t('placeholder')}
                className="transition duration-500 ease-[var(--ease-wood)] group-hover:scale-[1.03]"
              />
            </span>
            <span className="mt-2 block text-[0.875rem] text-ink-2 group-hover:text-ink">
              {piece.title[locale]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
