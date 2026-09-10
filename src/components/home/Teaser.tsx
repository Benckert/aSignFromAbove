import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import type { AppPathname } from '@/i18n/routing';
import { cx } from '@/lib/cx';

/**
 * The repeated block on the front page: a heading, a paragraph, a way onward.
 *
 * One component rather than three near-identical sections, so the rhythm down
 * the page stays even and a change to the spacing happens once.
 */
export function Teaser({
  eyebrow,
  title,
  lede,
  href,
  cta,
  aside,
  reverse,
  bordered = true,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  href: AppPathname;
  cta: string;
  aside?: ReactNode;
  /** Puts the illustration on the left instead, to break the pattern. */
  reverse?: boolean;
  bordered?: boolean;
}) {
  return (
    <section className={cx('py-16 lg:py-24', bordered && 'border-b border-rule')}>
      <div
        className={cx(
          'shell grid items-center gap-10',
          aside ? 'lg:grid-cols-2 lg:gap-16' : null,
        )}
      >
        <div className={cx(reverse && 'lg:order-2')}>
          <p className="spec">{eyebrow}</p>
          <h2 className="display mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)]">{title}</h2>
          <p className="prose-workshop mt-4">{lede}</p>
          <ButtonLink href={href} variant="secondary" className="mt-6">
            {cta} <ArrowRight size={15} aria-hidden />
          </ButtonLink>
        </div>
        {aside && <div className={cx(reverse && 'lg:order-1')}>{aside}</div>}
      </div>
    </section>
  );
}
