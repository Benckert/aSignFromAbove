import { getFont } from '@/config/carving-fonts';
import { getWood } from '@/config/woods';
import { BITS, MACHINE, PRICE_ROUNDING_ORE, SHOP } from '@/config/router-profile';
import { site } from '@/config/site';
import type { PriceBreakdown, SignDesign } from './types';
import { shapeCoverage, toLines } from './geometry';

/**
 * What a sign costs.
 *
 * The price is deterministic: the same design always produces the same figure,
 * on the server and in the browser alike. That is why it can be presented as a
 * real price rather than a guess — a customer who configures a sign today and
 * comes back tomorrow sees the same number.
 *
 * All money is integer öre. Nothing here touches floating-point currency.
 *
 * The model is: material + machine time + finishing + setup. Machine time is
 * estimated from the actual toolpath the design implies, which is why a long
 * inscription in a script face on oak costs more than three words in Bebas on
 * pine — and why the customer can see exactly which choice moved the number.
 */

/** Characters that carry no toolpath. */
const NON_CUTTING = /\s/g;

/** Number of depth passes needed to reach `depth` at the machine's pass depth. */
function passes(depthMm: number): number {
  return Math.max(1, Math.ceil(depthMm / MACHINE.passDepthMm));
}

/**
 * Total length of the outlines the cutter must follow for all lettering, in mm.
 *
 * Approximated per glyph as cap height × the face's `pathFactor`, which stands
 * in for how much outline an average character of that face carries.
 */
export function letteringPathLengthMm(design: SignDesign): number {
  return design.texts.reduce((total, block) => {
    const font = getFont(block.fontId);
    const characters = toLines(block.content)
      .join('')
      .replace(NON_CUTTING, '').length;
    return total + characters * block.capHeightMm * font.pathFactor;
  }, 0);
}

/** Length of the decorative border, in mm. */
export function decorationPathLengthMm(design: SignDesign): number {
  const { border, corners, insetMm } = design.decoration;
  if (border === 'none' && corners === 'none') return 0;

  const w = Math.max(design.widthMm - insetMm * 2, 0);
  const h = Math.max(design.heightMm - insetMm * 2, 0);
  const perimeter = 2 * (w + h);

  const borderLength =
    border === 'none'
      ? 0
      : border === 'line'
        ? perimeter
        : border === 'double'
          ? perimeter * 2.05
          : border === 'inset'
            ? perimeter * 1.15
            : // 'notch' — a broken line with cut corners
              perimeter * 1.3;

  // Corner motifs are small but fiddly; charged as a fixed length each.
  const cornerLength = corners === 'none' ? 0 : 4 * (corners === 'drilled' ? 20 : 90);

  return borderLength + cornerLength;
}

/** Estimated machine time in minutes, before the wood's machining factor. */
function baseCarveMinutes(design: SignDesign): number {
  const lettering = letteringPathLengthMm(design);
  const clearingBit = BITS.find((b) => b.id === 'em3')!;
  let minutes = 0;

  if (design.method === 'vcarve') {
    // The bit sweeps the outline and then the centreline of each stroke.
    minutes += (lettering * 3.0 * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.vcarve;
  } else if (design.method === 'pocket') {
    // Outline plus a raster fill of the letter interiors.
    minutes += (lettering * 3.5 * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.clearing;
  } else {
    // Raised: the whole background comes away, so cost tracks board area
    // rather than how much text there is.
    const boardMm2 = design.widthMm * design.heightMm * shapeCoverage(design.shape);
    // Roughly 60% of the face is background once lettering and margins are removed.
    const clearMm2 = boardMm2 * 0.6;
    const rasterLength = clearMm2 / (clearingBit.diameterMm * MACHINE.stepover);
    minutes += (rasterLength * passes(MACHINE.reliefDepthMm)) / MACHINE.feedMmPerMin.clearing;
    // The letters still need their edges walked cleanly.
    minutes += (lettering * 1.5) / MACHINE.feedMmPerMin.profile;
  }

  // Decoration is always cut with the V-bit.
  const decoration = decorationPathLengthMm(design);
  minutes += (decoration * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.vcarve;

  // Customer artwork: the outline length scales with how big it is rendered.
  if (design.artwork) {
    const artworkPath = design.artwork.widthMm * 12;
    minutes += (artworkPath * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.vcarve;
  }

  // Cutting a non-rectangular blank free of the stock.
  if (design.shape !== 'rect') {
    const perimeter = 2 * (design.widthMm + design.heightMm) * 0.95;
    minutes += (perimeter * passes(design.thicknessMm)) / MACHINE.feedMmPerMin.profile;
  }

  return minutes;
}

/** Minutes spent sanding, oiling and filling letters. */
function finishingMinutes(design: SignDesign, areaDm2: number): number {
  let minutes = areaDm2 * SHOP.finishingMinutesPerDm2;

  const characters = design.texts.reduce(
    (n, b) => n + toLines(b.content).join('').replace(NON_CUTTING, '').length,
    0,
  );

  switch (design.finish) {
    case 'raw':
      break;
    case 'oil':
      minutes += areaDm2 * 0.8;
      break;
    case 'paint':
      minutes += characters * 0.35 + 4;
      break;
    case 'oilPaint':
      minutes += areaDm2 * 0.8 + characters * 0.35 + 4;
      break;
  }

  // A chamfered or rounded edge is hand-finished after the profile cut.
  if (design.edge !== 'square') minutes += areaDm2 * 0.35 + 2;

  return minutes;
}

/** Fixed-price extras, in öre ex VAT. */
function extrasOre(design: SignDesign): number {
  const hanging =
    design.hanging === 'none'
      ? 0
      : design.hanging === 'keyhole'
        ? 6_000
        : design.hanging === 'rope'
          ? 11_000
          : 28_000; // posts, including the timber for them

  const artwork = design.artwork
    ? Math.round((SHOP.artworkSetupMinutes / 60) * SHOP.hourlyRateOre)
    : 0;

  const paint = design.finish === 'paint' || design.finish === 'oilPaint' ? 4_500 : 0;
  const oil = design.finish === 'oil' || design.finish === 'oilPaint' ? 3_500 : 0;

  return hanging + artwork + paint + oil;
}

export function priceSign(design: SignDesign): PriceBreakdown {
  const wood = getWood(design.woodId);

  // Material is charged on the rectangular blank the shape is cut from, since
  // that is what leaves the timber merchant.
  const areaDm2 = (design.widthMm * design.heightMm) / 10_000;
  const thicknessFactor = design.thicknessMm / MACHINE.thicknessesMm[0];
  const materialOre = Math.round(areaDm2 * wood.pricePerDm2 * thicknessFactor);

  const carveMinutes = baseCarveMinutes(design) * wood.machiningFactor;
  const carveOre = Math.round((carveMinutes / 60) * SHOP.hourlyRateOre);

  const finishMinutes = finishingMinutes(design, areaDm2);
  const finishingOre = Math.round((finishMinutes / 60) * SHOP.hourlyRateOre);

  const setupOre = SHOP.setupFeeOre;
  const extras = extrasOre(design);

  const rawSubtotal = materialOre + setupOre + carveOre + finishingOre + extras;
  const minimumApplied = rawSubtotal < SHOP.minimumOrderOre;
  const subtotalOre = minimumApplied ? SHOP.minimumOrderOre : rawSubtotal;

  const vatOre = site.legal.vatRegistered ? Math.round(subtotalOre * site.legal.vatRate) : 0;

  // Round the customer-facing total up to a whole 10 kr.
  const totalOre = Math.ceil((subtotalOre + vatOre) / PRICE_ROUNDING_ORE) * PRICE_ROUNDING_ORE;

  return {
    materialOre,
    setupOre,
    carveOre,
    finishingOre,
    extrasOre: extras,
    subtotalOre,
    vatOre,
    totalOre,
    minimumApplied,
    carveMinutes: Math.round(carveMinutes * 10) / 10,
  };
}

/**
 * Formats öre as Swedish kronor.
 *
 * Prices shown to consumers must include VAT under Prisinformationslagen
 * (2004:347); where a figure excluding VAT is shown alongside it, that is
 * stated explicitly next to it in the interface.
 */
export function formatOre(ore: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'sv-SE' : 'sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(ore / 100);
}
