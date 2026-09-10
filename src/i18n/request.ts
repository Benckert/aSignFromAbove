import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Sweden uses SEK and metric throughout; formatting is centralised so a
    // price or a measurement never renders with an English thousands separator.
    formats: {
      number: {
        currency: { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 },
      },
    },
  };
});
