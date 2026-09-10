import Image from 'next/image';
import { getWood } from '@/config/woods';
import type { Piece } from '@/content/furniture';

/**
 * A piece's photograph, or an honest stand-in for one.
 *
 * Nothing here pretends to be a photograph that does not exist. When a piece
 * has no images yet it gets a panel painted in that piece's own timbers with a
 * plain label saying a photograph is coming — which reads as a workshop that
 * has not got round to it, rather than as a broken image or, worse, a
 * fabricated picture of furniture nobody built.
 */
export function PieceImage({
  piece,
  label,
  priority,
  className,
}: {
  piece: Piece;
  label: string;
  priority?: boolean;
  className?: string;
}) {
  const [image] = piece.images;

  if (image) {
    return (
      <Image
        src={image}
        alt=""
        fill
        priority={priority}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={className}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  // A quiet empty frame, tinted towards the timbers the piece is made from.
  // The point is to read as "not photographed yet" and then get out of the way
  // — a bright panel here would shout louder than the real photographs it is
  // standing in for, and make the page look like the placeholders are the work.
  const [first] = piece.woods.map(getWood);
  const tint = first?.colour.base ?? '#c8a06a';

  return (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        backgroundImage:
          `linear-gradient(160deg, ${tint}1c, transparent 55%), ` +
          `repeating-linear-gradient(94deg, transparent 0 13px, ${tint}0a 13px 15px)`,
      }}
      aria-hidden="true"
    >
      <span className="text-[0.75rem] tracking-wide text-ink-3">{label}</span>
    </span>
  );
}
