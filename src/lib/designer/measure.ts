'use client';

import { CARVING_FONTS, getFont } from '@/config/carving-fonts';

/**
 * Measuring the real cap height of a loaded font.
 *
 * The designer works in millimetres of cap height, because that is what the
 * customer can picture and what decides whether a bit fits. SVG, however, sets
 * type by em size. Converting between the two needs the ratio of cap height to
 * em, and that ratio is a property of the specific font file — it is not 0.7
 * for everything, and it shifts between releases of a face.
 *
 * Rather than trust a table, this measures the fonts the browser actually
 * loaded. `actualBoundingBoxAscent` for a capital H is precisely the cap
 * height. The table in the font catalogue is only the fallback used for the
 * first paint and on the server.
 */

const MEASURE_PX = 200;

let cache: Record<string, number> | null = null;

/**
 * The catalogue's declared ratios, with no measurement and no DOM access.
 *
 * This is what both the server and the browser's *first* render must use. The
 * measured figures differ — Cinzel really is nearer 0.655 than the 0.70 in the
 * table — so measuring during the first client render would produce different
 * font sizes from the ones the server put in the HTML, which React reports as
 * a hydration mismatch. Measurement happens afterwards, in an effect.
 */
export function fallbackCapRatios(): Record<string, number> {
  return Object.fromEntries(CARVING_FONTS.map((f) => [f.id, f.capRatio]));
}

/** Resolves `var(--carve-x), serif` to the concrete family list. */
function resolveFamily(cssFamily: string): string {
  if (typeof document === 'undefined') return cssFamily;
  const root = getComputedStyle(document.documentElement);
  return cssFamily.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name) => {
    const value = root.getPropertyValue(name).trim();
    return value || 'serif';
  });
}

function measureOne(context: CanvasRenderingContext2D, cssFamily: string): number | null {
  context.font = `${MEASURE_PX}px ${resolveFamily(cssFamily)}`;
  const metrics = context.measureText('H');
  const ascent = metrics.actualBoundingBoxAscent;
  if (!Number.isFinite(ascent) || ascent <= 0) return null;
  const ratio = ascent / MEASURE_PX;
  // Guard against a failed font match reporting a nonsensical figure.
  return ratio > 0.4 && ratio < 0.95 ? ratio : null;
}

/**
 * Measures every carving face once and caches the result.
 * Returns the catalogue's fallback ratios if measurement is unavailable.
 */
export function measureCapRatios(): Record<string, number> {
  if (cache) return cache;

  const fallback = fallbackCapRatios();
  if (typeof document === 'undefined') return fallback;

  const context = document.createElement('canvas').getContext('2d');
  if (!context) return fallback;

  const measured: Record<string, number> = {};
  for (const font of CARVING_FONTS) {
    measured[font.id] = measureOne(context, font.cssFamily) ?? font.capRatio;
  }
  cache = measured;
  return measured;
}

/** Discards the cache, so a later call re-measures once webfonts have swapped in. */
export function invalidateCapRatios(): void {
  cache = null;
}

/** SVG font-size, in millimetres, that yields the requested cap height. */
export function fontSizeForCapHeight(
  fontId: string,
  capHeightMm: number,
  ratios?: Record<string, number>,
): number {
  const ratio = ratios?.[fontId] ?? getFont(fontId).capRatio;
  return capHeightMm / ratio;
}

/**
 * Width of the widest line of a block, in millimetres, at a given cap height.
 *
 * Canvas measurement is exact for the glyphs but knows nothing about the
 * tracking the designer applies, so that is added back on: one gap per
 * character except the last.
 */
export function measureBlockWidthMm(
  lines: string[],
  cssFamily: string,
  capHeightMm: number,
  letterSpacingEm: number,
  ratios?: Record<string, number>,
  fontId?: string,
): number {
  if (typeof document === 'undefined') return 0;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return 0;

  const ratio = (fontId && ratios?.[fontId]) || 0.7;
  const emMm = capHeightMm / ratio;

  // Measure at a large fixed size and scale, which avoids sub-pixel rounding.
  const PROBE = 200;
  context.font = `${PROBE}px ${resolveFamily(cssFamily)}`;

  let widest = 0;
  for (const line of lines) {
    if (!line) continue;
    const glyphs = (context.measureText(line).width / PROBE) * emMm;
    const tracking = letterSpacingEm * emMm * Math.max(line.length - 1, 0);
    widest = Math.max(widest, glyphs + tracking);
  }
  return widest;
}

/**
 * The largest cap height at which a block still fits the width available.
 *
 * Width scales linearly with cap height, so one measurement is enough to solve
 * for it directly rather than searching.
 */
export function capHeightToFit(
  lines: string[],
  cssFamily: string,
  availableMm: number,
  letterSpacingEm: number,
  ratios?: Record<string, number>,
  fontId?: string,
): number | null {
  const probeCap = 100;
  const widthAtProbe = measureBlockWidthMm(
    lines,
    cssFamily,
    probeCap,
    letterSpacingEm,
    ratios,
    fontId,
  );
  if (widthAtProbe <= 0) return null;
  const fitted = (availableMm / widthAtProbe) * probeCap;
  // Leave a whisker of margin and keep it to a whole millimetre, since that is
  // how the value is specified to the workshop.
  return Math.max(6, Math.floor(fitted * 0.98));
}
