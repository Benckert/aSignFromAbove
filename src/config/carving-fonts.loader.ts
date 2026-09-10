import {
  Cinzel,
  Merriweather,
  Roboto_Slab,
  Alfa_Slab_One,
  Oswald,
  Bebas_Neue,
  Libre_Baskerville,
  Dancing_Script,
  Playfair_Display,
} from 'next/font/google';

/**
 * Loads the carving faces and exposes them as CSS custom properties.
 *
 * Kept apart from the metadata in `carving-fonts.ts` because `next/font` is a
 * compile-time transform that only resolves inside the Next.js build — importing
 * it from a module that plain Node has to read (tests, the price engine) breaks
 * both. The variable names below must match `CarvingFont.variable`; a unit test
 * checks that they do.
 *
 * Variable families take no `weight`; the static ones must name theirs.
 * All are self-hosted at build time, so no visitor's browser ever contacts
 * a third-party font server.
 */

const cinzel = Cinzel({ subsets: ['latin'], display: 'swap', variable: '--carve-cinzel' });
const merriweather = Merriweather({
  subsets: ['latin'],
  display: 'swap',
  variable: '--carve-merriweather',
});
const robotoSlab = Roboto_Slab({ subsets: ['latin'], display: 'swap', variable: '--carve-slab' });
const alfaSlab = Alfa_Slab_One({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--carve-alfa',
});
const oswald = Oswald({ subsets: ['latin'], display: 'swap', variable: '--carve-oswald' });
const bebas = Bebas_Neue({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--carve-bebas',
});
const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  display: 'swap',
  variable: '--carve-baskerville',
});
const dancing = Dancing_Script({ subsets: ['latin'], display: 'swap', variable: '--carve-dancing' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--carve-playfair',
});

/** Applied on the designer route so these faces load only where they are used. */
export const carvingFontVariables = [
  cinzel.variable,
  merriweather.variable,
  robotoSlab.variable,
  alfaSlab.variable,
  oswald.variable,
  bebas.variable,
  baskerville.variable,
  dancing.variable,
  playfair.variable,
].join(' ');

/** The variables this module defines, for the consistency test. */
export const LOADED_FONT_VARIABLES = [
  '--carve-cinzel',
  '--carve-merriweather',
  '--carve-slab',
  '--carve-alfa',
  '--carve-oswald',
  '--carve-bebas',
  '--carve-baskerville',
  '--carve-dancing',
  '--carve-playfair',
];
