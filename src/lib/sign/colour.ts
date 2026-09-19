/**
 * Small colour helpers for the preview.
 *
 * The palette a sign is drawn with is derived from the species' own three
 * colours rather than picked separately, so adding a new timber to the
 * catalogue never means touching the renderer.
 */

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

/** Mixes towards black (negative) or white (positive), by a 0–1 amount. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return toHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

/**
 * Relative luminance, per WCAG. Used to decide whether text sitting on a piece
 * of timber needs to be lighter or darker than the wood to stay legible —
 * walnut and pine need opposite answers.
 */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True when a surface is dark enough that a cut into it should read lighter. */
export function isDark(hex: string): boolean {
  return luminance(hex) < 0.28;
}
