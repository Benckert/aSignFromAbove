import type { MetadataRoute } from 'next';
import { site } from '@/config/site';
import { routing, type AppPathname } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';

/**
 * Both language versions of every page, cross-referenced with hreflang so the
 * Swedish and English URLs are understood as the same page rather than as
 * duplicates competing with each other.
 */
const PAGES: Array<{ path: AppPathname; priority: number }> = [
  { path: '/', priority: 1 },
  { path: '/designer', priority: 0.9 },
  { path: '/furniture', priority: 0.8 },
  { path: '/workshop', priority: 0.6 },
  { path: '/contact', priority: 0.7 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/cookies', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${site.url}${getPathname({ href: path, locale: routing.defaultLocale })}`,
    priority,
    changeFrequency: 'monthly' as const,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${site.url}${getPathname({ href: path, locale })}`]),
      ),
    },
  }));
}
