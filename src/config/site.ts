/**
 * Every piece of business identity on the site is read from here.
 *
 * "A Sign From Above" is a working title. To rename the business, change
 * `brand.name` (and `brand.shortName` if the new name is long) — nothing else
 * in the codebase hard-codes it.
 *
 * The fields marked TODO are legally required before the site goes live:
 * Swedish e-commerce law (lag 2002:562 om elektronisk handel, 8 §) requires a
 * trader to state its name, geographic address, email and organisation number
 * in a directly accessible form, and the GDPR requires the controller's
 * identity and contact details in the privacy notice (art. 13.1 a).
 */

export const site = {
  brand: {
    /** Working title — safe to change; used everywhere. */
    name: 'A Sign From Above',
    /** Used where the full name will not fit (tight mobile headers, og:site_name). */
    shortName: 'A Sign From Above',
    /** Not a translation of the name — the name stays as-is in both languages. */
    tagline: {
      sv: 'Handfrästa skyltar och möbler på beställning',
      en: 'Hand-routed signs and one-off furniture',
    },
  },

  /** The person behind the workshop. One-person shop — this is deliberate. */
  maker: {
    // TODO: replace with the real name shown to customers.
    name: 'TODO: Ditt namn',
  },

  legal: {
    // TODO: registered company name, if it differs from the brand name.
    entityName: 'TODO: Registrerat firmanamn',
    // TODO: Swedish organisationsnummer, format NNNNNN-NNNN.
    organisationNumber: 'TODO: XXXXXX-XXXX',
    // TODO: VAT number, usually SE + org.nr without hyphen + 01.
    vatNumber: 'TODO: SEXXXXXXXXXX01',
    /**
     * Whether the business is registered for VAT (momsregistrerad).
     * A small workshop under the Swedish turnover threshold may not be.
     * When false, prices are shown without VAT and the exemption is stated,
     * which Prisinformationslagen (2004:347) requires to be done clearly.
     */
    vatRegistered: true,
    /** Swedish standard VAT rate for goods, as a fraction. */
    vatRate: 0.25,
    /** Registered for F-skatt — customers commonly want to see this. */
    fskatt: true,
  },

  contact: {
    // TODO: the address customers may write to. A workshop address is fine.
    address: {
      street: 'TODO: Gatuadress',
      postalCode: 'TODO: XXX XX',
      city: 'TODO: Ort',
      country: { sv: 'Sverige', en: 'Sweden' },
    },
    // TODO: real addresses. `orders` receives designer submissions.
    email: 'TODO@example.se',
    ordersEmail: 'TODO@example.se',
    privacyEmail: 'TODO@example.se',
    // TODO: phone in international format, or set to null to hide it everywhere.
    phone: '+46 XX XXX XX XX' as string | null,
  },

  /** Set to null to hide the link; the footer renders only what exists. */
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },

  /** Canonical origin, without a trailing slash. Used for metadata and sitemap. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.se',

  /**
   * How long a customer normally waits. Shown on the order step so nobody is
   * left guessing — an honest lead time beats a fake "fast delivery" badge.
   */
  leadTimeWeeks: { min: 2, max: 4 },

  /**
   * When the legal documents were last revised, as an ISO date.
   * Set by hand rather than from the build clock: a policy's date must mean
   * "this text changed", not "the site was redeployed".
   */
  legalUpdated: '2026-09-10',

  /** Newsletter is planned but not live; this gates the sign-up UI. */
  features: {
    newsletter: false,
  },
} as const;

export type Site = typeof site;

/** True when any TODO placeholder is still present — surfaces a dev-only warning. */
export function hasPlaceholderDetails(): boolean {
  return JSON.stringify(site).includes('TODO');
}
