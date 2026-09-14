import type { Font } from 'opentype.js';

/**
 * Getting a parsed face into the browser.
 *
 * The faces are served as TrueType from /fonts, not as the WOFF2 `next/font`
 * produces, because opentype.js cannot read WOFF2 — see scripts/fetch-fonts.mjs
 * for why. One face is fetched when somebody picks it, never all nine: the
 * catalogue is 860 KB in total and no single sign uses more than a couple of it.
 *
 * opentype.js itself is imported dynamically. It is 245 KB minified, which is
 * worth paying for a design tool and not worth paying for a page that merely
 * links to one, so it arrives in its own chunk alongside the first font file
 * rather than inside the route's bundle.
 */

const parsed = new Map<string, Font>();
const pending = new Map<string, Promise<Font>>();

/**
 * The face if it is already here, otherwise undefined.
 *
 * Lets a render draw immediately with what it has instead of suspending, which
 * is what keeps dragging smooth while a second face is still arriving.
 */
export function loadedFace(id: string): Font | undefined {
  return parsed.get(id);
}

/**
 * Fetches and parses a face, once.
 *
 * Concurrent callers share one request: the preview and the font picker both
 * want the same file the instant it is chosen, and two fetches for it would be
 * two downloads.
 */
export function loadFace(id: string): Promise<Font> {
  const ready = parsed.get(id);
  if (ready) return Promise.resolve(ready);

  const existing = pending.get(id);
  if (existing) return existing;

  const request = (async () => {
    const [{ parse }, response] = await Promise.all([
      import('opentype.js'),
      fetch(`/fonts/${id}.ttf`),
    ]);
    if (!response.ok) throw new Error(`could not load the ${id} face (${response.status})`);
    const font = parse(await response.arrayBuffer());
    parsed.set(id, font);
    pending.delete(id);
    return font;
  })();

  pending.set(id, request);
  // A failed load must not be cached as a permanent refusal: a flaky network
  // should be retried the next time the face is asked for.
  request.catch(() => pending.delete(id));
  return request;
}
