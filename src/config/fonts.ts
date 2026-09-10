import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';

/**
 * Site typography.
 *
 * All three faces are downloaded at build time and served from our own origin.
 * That is required here rather than merely tidy: linking to fonts.gstatic.com
 * would send every visitor's IP address to a third party before they have
 * agreed to anything.
 */

/** Headings. A warm, slightly irregular serif — the opposite of a system font. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
});

/** Body copy and interface text. */
export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument',
});

/** Measurements, wood names, section numbers — anything that reads as a spec. */
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

export const fontVariables = [fraunces.variable, instrumentSans.variable, plexMono.variable].join(
  ' ',
);
