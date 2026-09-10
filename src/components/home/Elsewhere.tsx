import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { AppPathname } from '@/i18n/routing';

/**
 * Furniture, custom work and the workshop.
 *
 * Deliberately not three equal columns. Everything on this site was arriving
 * in tidy grids of three and four, which is the visual signature of a template
 * rather than of a workshop — so the furniture entry takes the width it
 * deserves and the other two sit beside it in a narrower stack.
 */
export function Elsewhere() {
  const furniture = useTranslations('home.furniture');
  const custom = useTranslations('home.custom');
  const maker = useTranslations('home.maker');

  const minor: Array<{ href: AppPathname; title: string; lede: string }> = [
    { href: '/custom', title: custom('title'), lede: custom('lede') },
    { href: '/workshop', title: maker('title'), lede: maker('lede') },
  ];

  return (
    <section className="shell grid gap-10 py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
      <Link href="/furniture" className="group block">
        <h2 className="display text-[clamp(1.6rem,3vw,2.1rem)] group-hover:text-oak-deep">
          {furniture('title')}
        </h2>
        <p className="mt-3 max-w-[38ch] text-[0.9375rem] leading-relaxed text-ink-2">
          {furniture('lede')}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-oak-deep">
          {furniture('cta')}
          <ArrowRight size={14} aria-hidden className="transition group-hover:translate-x-0.5" />
        </span>
      </Link>

      <ul className="flex flex-col divide-y divide-rule border-t border-rule lg:mt-2">
        {minor.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="group block py-5">
              <h2 className="text-[1.0625rem] font-medium text-ink group-hover:text-oak-deep">
                {item.title}
              </h2>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-3">{item.lede}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
