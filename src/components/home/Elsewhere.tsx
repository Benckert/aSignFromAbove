import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { AppPathname } from '@/i18n/routing';

/**
 * Furniture, custom work and the workshop, as one row of three.
 *
 * These were three full-width sections with their own headings and artwork.
 * That gave the secondary half of the business the same visual weight as the
 * designer, which is not the balance the site wants.
 */
export function Elsewhere() {
  const furniture = useTranslations('home.furniture');
  const custom = useTranslations('home.custom');
  const maker = useTranslations('home.maker');

  const items: Array<{ href: AppPathname; title: string; lede: string; cta: string }> = [
    {
      href: '/furniture',
      title: furniture('title'),
      lede: furniture('lede'),
      cta: furniture('cta'),
    },
    { href: '/custom', title: custom('title'), lede: custom('lede'), cta: custom('cta') },
    { href: '/workshop', title: maker('title'), lede: maker('lede'), cta: maker('cta') },
  ];

  return (
    <section className="py-12 lg:py-16">
      <ul className="shell grid gap-x-8 gap-y-8 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="group block">
              <h2 className="text-[1.0625rem] font-medium text-ink group-hover:text-oak-deep">
                {item.title}
              </h2>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-3">{item.lede}</p>
              <span className="mt-2.5 inline-flex items-center gap-1.5 text-[0.8125rem] text-oak-deep">
                {item.cta}
                <ArrowRight
                  size={13}
                  aria-hidden
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
