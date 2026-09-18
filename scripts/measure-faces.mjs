/**
 * Reads the true cap height of every carving face, for the catalogue.
 *
 * "40 mm letters" means a capital 40 mm tall, and turning that into an SVG
 * font-size needs the ratio of cap height to em — a property of the specific
 * font file, not something to be guessed at. It was guessed at once, and the
 * guesses were out by as much as a quarter, which made a sign in Dancing Script
 * a quarter smaller than the one the customer had asked for.
 *
 * The fonts are fetched to a temporary folder, measured, and thrown away: the
 * site itself uses `next/font`, and the numbers this prints are the only thing
 * that needs to survive. Paste them into src/config/carving-fonts.ts.
 *
 *   node scripts/measure-faces.mjs
 *
 * opentype.js is a dev dependency for exactly this, and for the toolpath export
 * when that arrives — nothing here is sent to a browser.
 */

import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Node resolves the CommonJS build here, which carries a default and no
// named exports; the browser build is the other way round.
import opentype from 'opentype.js';

/** Only an old user agent is offered TrueType; everything modern gets WOFF2. */
const TRUETYPE_UA =
  'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-T210R Build/JSS15J)' +
  ' AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30';

const FACES = [
  ['cinzel', 'Cinzel'],
  ['merriweather', 'Merriweather'],
  ['roboto-slab', 'Roboto Slab'],
  ['alfa-slab', 'Alfa Slab One'],
  ['oswald', 'Oswald'],
  ['bebas', 'Bebas Neue'],
  ['baskerville', 'Libre Baskerville'],
  ['dancing', 'Dancing Script'],
  ['playfair', 'Playfair Display'],
];

const directory = await mkdtemp(join(tmpdir(), 'faces-'));

try {
  for (const [id, family] of FACES) {
    const query = `family=${encodeURIComponent(family)}&subset=latin,latin-ext`;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css?${query}`, {
        headers: { 'User-Agent': TRUETYPE_UA },
      })
    ).text();
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) throw new Error(`no font url for ${family}`);

    const path = join(directory, `${id}.ttf`);
    await writeFile(path, Buffer.from(await (await fetch(url)).arrayBuffer()));

    const file = await readFile(path);
    const font = opentype.parse(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    );
    // The outline of an H is what cap height means. The OS/2 table declares a
    // figure too, but that is what the designer intended and this is what the
    // face actually does.
    const ratio = font.charToGlyph('H').getBoundingBox().y2 / font.unitsPerEm;
    console.log(`${id.padEnd(14)} capRatio: ${Number(ratio.toFixed(4))},`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
