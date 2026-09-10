'use client';

/**
 * Getting the preview out of the browser as a file.
 *
 * An SVG that references a font by name renders with whatever font the opening
 * program happens to have, and a browser refuses to load external fonts at all
 * when an SVG is drawn into a canvas. So before exporting anything, the fonts
 * the preview actually used are collected from the page's own stylesheets and
 * inlined into the file as base64.
 *
 * Every font here is served from our own origin by `next/font`, so fetching
 * them back is a same-origin request and needs no special handling.
 *
 * If that inlining fails for any reason, the export still happens — the caller
 * is told the fonts are not embedded so it can label the result as indicative
 * rather than exact. Losing the picture entirely would be worse than losing
 * the typeface, and the written specification is the authoritative document
 * either way.
 */

export interface ExportResult {
  svg: string;
  fontsEmbedded: boolean;
}

/** Collects the @font-face rules the document is using, with the files inlined. */
async function inlineFontFaces(): Promise<{ css: string; ok: boolean }> {
  const chunks: string[] = [];
  let ok = true;

  const rules: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let sheetRules: CSSRuleList;
    try {
      // Reading cssRules on a cross-origin sheet throws; ours are same-origin.
      sheetRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(sheetRules)) {
      if (rule instanceof CSSFontFaceRule) rules.push(rule);
    }
  }

  await Promise.all(
    rules.map(async (rule) => {
      const src = rule.style.getPropertyValue('src');
      const match = src.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match) return;
      try {
        const response = await fetch(match[1]);
        if (!response.ok) throw new Error(String(response.status));
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const family = rule.style.getPropertyValue('font-family');
        const weight = rule.style.getPropertyValue('font-weight') || 'normal';
        const style = rule.style.getPropertyValue('font-style') || 'normal';
        chunks.push(
          `@font-face{font-family:${family};font-style:${style};font-weight:${weight};` +
            `src:url(data:font/woff2;base64,${base64}) format("woff2");}`,
        );
      } catch {
        ok = false;
      }
    }),
  );

  return { css: chunks.join(''), ok };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked so a large font does not blow the argument limit of fromCharCode.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Serialises the live preview element, resolving the CSS custom properties it
 * relies on so the file stands on its own.
 */
export async function exportSvg(source: SVGSVGElement): Promise<ExportResult> {
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('style');

  // Font families in the preview are written as var(--carve-x); resolve each
  // one against the live element so the clone does not depend on page CSS.
  const computedRoot = getComputedStyle(source);
  const resolveVar = (value: string): string =>
    value.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name) =>
      computedRoot.getPropertyValue(name).trim(),
    );

  clone.querySelectorAll<SVGElement>('[font-family]').forEach((el) => {
    const family = el.getAttribute('font-family');
    if (family) el.setAttribute('font-family', resolveVar(family));
  });

  const { css, ok } = await inlineFontFaces();
  if (css) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }

  const svg = new XMLSerializer().serializeToString(clone);
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, fontsEmbedded: ok && css !== '' };
}

/** Rasterises an exported SVG string to a PNG data URL. */
export async function svgToPng(svg: string, pixelWidth = 1400): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const ratio = image.height / image.width || 0.5;
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = Math.round(pixelWidth * ratio);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // JPEG-like quality is irrelevant here; the preview has flat areas and
    // text edges, which PNG handles better than a lossy format.
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not rasterise the preview'));
    image.src = src;
  });
}

/** Offers a string to the visitor as a file download. */
export function downloadFile(contents: string | Blob, fileName: string, mime: string): void {
  const blob = typeof contents === 'string' ? new Blob([contents], { type: mime }) : contents;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
