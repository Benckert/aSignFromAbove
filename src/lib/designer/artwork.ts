'use client';

import DOMPurify from 'dompurify';
import type { Artwork } from './types';

/**
 * Accepting an uploaded SVG means accepting a file format that can contain
 * script, external references and embedded HTML. Everything here exists to
 * reduce that file to inert geometry before it is put anywhere near the page.
 *
 * The defence is layered:
 *   1. Size and type are checked before parsing.
 *   2. DOMPurify strips the file to an allow-list of shape elements.
 *   3. Anything that could still reach the network — <image>, <use>, <a>,
 *      external hrefs — is removed explicitly.
 *   4. Colours are discarded and replaced with `currentColor`, because the
 *      artwork is going to be cut into wood, not printed. This also removes an
 *      entire category of CSS-based trickery for free.
 *
 * The server repeats an equivalent check when the order is submitted, because
 * anything validated only in the browser is not validated at all.
 */

/** Refuse anything larger than this. Carving artwork is simple geometry. */
export const MAX_ARTWORK_BYTES = 512 * 1024;

export type ArtworkResult =
  | { ok: true; artwork: Artwork }
  | { ok: false; reason: 'too-large' | 'not-svg' | 'unparseable' | 'empty' };

const ALLOWED_TAGS = [
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'defs',
  'clipPath',
  'title',
  'desc',
];

const ALLOWED_ATTR = [
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'width',
  'height',
  'viewBox',
  'transform',
  'fill-rule',
  'clip-rule',
  'clip-path',
  'id',
  'xmlns',
];

export function sanitizeArtwork(raw: string, fileName: string): ArtworkResult {
  if (new Blob([raw]).size > MAX_ARTWORK_BYTES) return { ok: false, reason: 'too-large' };
  if (!raw.includes('<svg')) return { ok: false, reason: 'not-svg' };

  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: false },
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'foreignObject', 'image', 'use', 'a', 'animate', 'set'],
    KEEP_CONTENT: false,
  });

  const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg || doc.querySelector('parsererror')) return { ok: false, reason: 'unparseable' };

  // Work out the intrinsic aspect ratio from the viewBox, falling back to the
  // width/height attributes and finally to a square.
  const viewBox = svg.getAttribute('viewBox');
  let aspect = 1;
  if (viewBox) {
    const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);
    if (vw > 0 && vh > 0) aspect = vw / vh;
  } else {
    const w = parseFloat(svg.getAttribute('width') ?? '');
    const h = parseFloat(svg.getAttribute('height') ?? '');
    if (w > 0 && h > 0) {
      aspect = w / h;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
  }

  // Strip the outer sizing so the artwork scales to wherever it is placed.
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  // Discard all colour. The finished artwork is a cut, not a picture.
  svg.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('style');
    el.removeAttribute('stroke');
    el.removeAttribute('stroke-width');
    el.removeAttribute('opacity');
    el.removeAttribute('fill-opacity');
    if (el.tagName !== 'svg') el.setAttribute('fill', 'currentColor');
  });

  const hasGeometry = svg.querySelector('path, circle, ellipse, line, polyline, polygon, rect');
  if (!hasGeometry) return { ok: false, reason: 'empty' };

  return {
    ok: true,
    artwork: {
      svg: svg.outerHTML,
      fileName: fileName.slice(0, 120),
      aspect,
      widthMm: 60,
      x: 0.5,
      y: 0.24,
      rotation: 0,
    },
  };
}
