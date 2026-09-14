/**
 * Downloads the carving faces as TrueType, for outline generation.
 *
 * Why these files exist in the repository at all, when `next/font` already
 * self-hosts the same nine faces:
 *
 * The designer draws lettering as real glyph outlines rather than as <text>,
 * because an outline is both exactly measurable and exactly what the router
 * cuts. Outlines come from opentype.js, and opentype.js cannot read WOFF2 —
 * Brotli decompression would make the library roughly ten times heavier, so
 * the project declines to carry it. WOFF2 is precisely what `next/font`
 * serves. Hence a second copy of each face, in a format that can be parsed.
 *
 * They are committed rather than fetched at build time so that a build never
 * depends on Google being reachable, and so the workshop's own machine can
 * build the site offline. Re-run this script only to update a face:
 *
 *   node scripts/fetch-fonts.mjs
 *
 * The files come from the Google Fonts CSS API rather than from the fonts
 * repository, for two reasons. The API returns a single static instance at
 * weight 400, where the repository now ships most families as variable fonts —
 * and a variable font asked for its outlines gives its default instance, which
 * is the same thing by a longer route. And the API returns the Latin subset:
 * Merriweather is 4.5 MB of every script it supports in the repository, and
 * 316 KB of the letters a Swedish sign can actually use. The one request in
 * this file that a browser ever makes is for a single face, on demand, when
 * somebody picks it.
 *
 * Every face is redistributable: eight under the SIL Open Font Licence, one
 * (Roboto Slab) under Apache 2.0. Both licences require the text to travel
 * with the font, so it is fetched alongside and served from the same folder.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'fonts');
const REPO = 'https://raw.githubusercontent.com/google/fonts/main';

/*
  The API decides what to serve from the user agent, and only an old one is
  offered TrueType — everything modern is given WOFF2, which is the one format
  opentype.js cannot read. This is the polite way to ask for the old format;
  it is not pretending to be a browser in order to get something otherwise
  withheld, since all of these files are published for download anyway.
*/
const TRUETYPE_UA =
  'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-T210R Build/JSS15J)' +
  ' AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30';

/**
 * `id` matches the id in src/config/carving-fonts.ts, so the file a face needs
 * is always `/fonts/<id>.ttf`. A test keeps the two lists in step.
 */
const FACES = [
  { id: 'cinzel', family: 'Cinzel', licence: 'ofl/cinzel/OFL.txt' },
  { id: 'merriweather', family: 'Merriweather', licence: 'ofl/merriweather/OFL.txt' },
  { id: 'roboto-slab', family: 'Roboto Slab', licence: 'apache/robotoslab/LICENSE.txt' },
  { id: 'alfa-slab', family: 'Alfa Slab One', licence: 'ofl/alfaslabone/OFL.txt' },
  { id: 'oswald', family: 'Oswald', licence: 'ofl/oswald/OFL.txt' },
  { id: 'bebas', family: 'Bebas Neue', licence: 'ofl/bebasneue/OFL.txt' },
  { id: 'baskerville', family: 'Libre Baskerville', licence: 'ofl/librebaskerville/OFL.txt' },
  { id: 'dancing', family: 'Dancing Script', licence: 'ofl/dancingscript/OFL.txt' },
  { id: 'playfair', family: 'Playfair Display', licence: 'ofl/playfairdisplay/OFL.txt' },
];

async function get(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response;
}

/** Resolves a family name to the URL of its Latin TrueType file. */
async function resolveFontUrl(family) {
  const query = `family=${encodeURIComponent(family)}&subset=latin,latin-ext`;
  const css = await (
    await get(`https://fonts.googleapis.com/css?${query}`, { 'User-Agent': TRUETYPE_UA })
  ).text();
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`no font url in the stylesheet for ${family}`);
  return url;
}

await mkdir(join(OUT, 'licences'), { recursive: true });

for (const face of FACES) {
  const font = Buffer.from(await (await get(await resolveFontUrl(face.family))).arrayBuffer());

  // A TrueType file opens with 0x00010000 or 'true'; anything else means an
  // error document arrived where a font was expected.
  const magic = font.readUInt32BE(0);
  if (magic !== 0x00010000 && magic !== 0x74727565) {
    throw new Error(`${face.id}: not a TrueType file (magic 0x${magic.toString(16)})`);
  }

  await writeFile(join(OUT, `${face.id}.ttf`), font);
  const licence = await (await get(`${REPO}/${face.licence}`)).text();
  await writeFile(join(OUT, 'licences', `${face.id}.txt`), licence);
  console.log(`${face.id.padEnd(13)} ${(font.length / 1024).toFixed(0).padStart(4)} KB`);
}

console.log(`\n${FACES.length} faces in public/fonts, licences alongside.`);
