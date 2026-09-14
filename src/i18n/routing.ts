import { defineRouting } from 'next-intl/routing';

/**
 * Swedish is the default and lives at the bare path (`/`, `/designa-skylt`).
 * English is prefixed (`/en`, `/en/design-your-sign`).
 *
 * Paths are localised rather than shared so that each language gets URLs a
 * human would actually type, which also keeps the two versions from competing
 * in search results.
 */
export const routing = defineRouting({
  locales: ['sv', 'en'],
  defaultLocale: 'sv',
  localePrefix: 'as-needed',
  // Do not guess from Accept-Language: a Swedish workshop's visitors are
  // overwhelmingly Swedish, and silent redirects based on browser headers are
  // a common source of confusion. The visitor chooses, and the choice sticks.
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/designer': {
      sv: '/designa-skylt',
      en: '/design-your-sign',
    },
    '/designer/order': {
      sv: '/designa-skylt/bestall',
      en: '/design-your-sign/order',
    },
    /*
      The rebuilt designer, running alongside the one it is meant to replace.

      Kept at its own address rather than behind a flag so that the two can be
      opened side by side and compared on the same sign. It is not in the
      sitemap and it asks not to be indexed; when it wins, it takes over
      '/designer' and this entry goes.
    */
    '/designer/next': {
      sv: '/designa-skylt/ny',
      en: '/design-your-sign/new',
    },
    '/furniture': {
      sv: '/mobler',
      en: '/furniture',
    },
    '/workshop': {
      sv: '/verkstaden',
      en: '/workshop',
    },
    '/contact': {
      sv: '/kontakt',
      en: '/contact',
    },
    '/privacy': {
      sv: '/integritetspolicy',
      en: '/privacy-policy',
    },
    '/terms': {
      sv: '/kopvillkor',
      en: '/terms',
    },
    '/cookies': {
      sv: '/kakor',
      en: '/cookies',
    },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
