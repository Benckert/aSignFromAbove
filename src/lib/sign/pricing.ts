import { getFont } from '@/config/carving-fonts';
import { getWood } from '@/config/woods';
import { BITS, MACHINE, PRICE_ROUNDING_ORE, SHOP } from '@/config/router-profile';
import { site } from '@/config/site';
import { borderPathLengthMm, shapeCoverage } from './geometry';
import type { Sign } from './model';
import { toLines } from './text';

/**
 * What a sign costs.
 *
 * The price is deterministic: the same sign always produces the same figure, on
 * the server and in the browser alike. That is why it can be presented as a
 * real price rather than a guess — a customer who configures a sign today and
 * comes back tomorrow sees the same number.
 *
 * All money is integer öre. Nothing here touches floating-point currency.
 *
 * The model is material + machine time + finishing + setup. Machine time is
 * estimated from the toolpath the design implies, which is why a long
 * inscription in a script face on oak costs more than three words in Bebas on
 * pine — and why a customer can see exactly which choice moved the number.
 */

/** Characters that carry no toolpath. */
const NON_CUTTING = /\s/g;

/** Number of depth passes needed to reach `depth` at the machine's pass depth. */
function passes(depthMm: number): number {
  return Math.max(1, Math.ceil(depthMm / MACHINE.passDepthMm));
}

/** How many characters actually have to be cut. */
function cuttingCharacters(sign: Sign): number {
  return sign.blocks.reduce(
    (total, block) => total + toLines(block.text).join('').replace(NON_CUTTING, '').length,
    0,
  );
}

/**
 * Total length of the outlines the cutter must follow for all lettering, in mm.
 *
 * Approximated per glyph as cap height × the face's `pathFactor`, which stands
 * in for how much outline an average character of that face carries. Summed per
 * block, because each block now has its own face and its own size — a name at
 * 50 mm over a year at 18 mm is two quite different amounts of cutting, and
 * charging both at one size was wrong in whichever direction you rounded.
 */
export function letteringPathLengthMm(sign: Sign): number {
  return sign.blocks.reduce((total, block) => {
    const font = getFont(block.fontId);
    const characters = toLines(block.text).join('').replace(NON_CUTTING, '').length;
    return total + characters * block.capHeightMm * font.pathFactor;
  }, 0);
}

/** Estimated machine time in minutes, before the wood's machining factor. */
function baseCarveMinutes(sign: Sign): number {
  const lettering = letteringPathLengthMm(sign);
  const clearingBit = BITS.find((b) => b.id === 'em3')!;
  let minutes = 0;

  if (sign.method === 'vcarve') {
    // The bit sweeps the outline and then the centreline of each stroke.
    minutes += (lettering * 3.0 * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.vcarve;
  } else if (sign.method === 'pocket') {
    // Outline plus a raster fill of the letter interiors.
    minutes += (lettering * 3.5 * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.clearing;
  } else {
    // Raised: the whole background comes away, so cost tracks board area rather
    // than how much text there is.
    const boardMm2 = sign.widthMm * sign.heightMm * shapeCoverage(sign.shape);
    // Roughly 60% of the face is background once lettering and margins are gone.
    const clearMm2 = boardMm2 * 0.6;
    const rasterLength = clearMm2 / (clearingBit.diameterMm * MACHINE.stepover);
    minutes += (rasterLength * passes(MACHINE.reliefDepthMm)) / MACHINE.feedMmPerMin.clearing;
    // The letters still need their edges walked cleanly.
    minutes += (lettering * 1.5) / MACHINE.feedMmPerMin.profile;
  }

  // The border is always cut with the V-bit, whatever the lettering is cut with.
  minutes +=
    (borderPathLengthMm(sign) * passes(MACHINE.carveDepthMm)) / MACHINE.feedMmPerMin.vcarve;

  // Cutting a non-rectangular blank free of the stock.
  if (sign.shape !== 'rect') {
    const perimeter = 2 * (sign.widthMm + sign.heightMm) * 0.95;
    minutes += (perimeter * passes(sign.thicknessMm)) / MACHINE.feedMmPerMin.profile;
  }

  return minutes;
}

/** Minutes spent sanding, oiling and filling letters. */
function finishingMinutes(sign: Sign, areaDm2: number): number {
  let minutes = areaDm2 * SHOP.finishingMinutesPerDm2;
  const characters = cuttingCharacters(sign);

  switch (sign.finish) {
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
  if (sign.edge !== 'square') minutes += areaDm2 * 0.35 + 2;

  return minutes;
}

/** Fixed-price extras, in öre ex VAT. */
function extrasOre(sign: Sign): number {
  const hanging =
    sign.hanging === 'none'
      ? 0
      : sign.hanging === 'keyhole'
        ? 6_000
        : sign.hanging === 'rope'
          ? 11_000
          : 28_000; // posts, including the timber for them

  const paint = sign.finish === 'paint' || sign.finish === 'oilPaint' ? 4_500 : 0;
  const oil = sign.finish === 'oil' || sign.finish === 'oilPaint' ? 3_500 : 0;

  return hanging + paint + oil;
}

/** A price broken into the parts it is built from, all in öre, ex VAT. */
export interface PriceBreakdown {
  materialOre: number;
  setupOre: number;
  carveOre: number;
  finishingOre: number;
  extrasOre: number;
  /** Sum of the above, before VAT, after the minimum-order floor is applied. */
  subtotalOre: number;
  vatOre: number;
  /** What the customer pays. Rounded up to a whole 10 kr. */
  totalOre: number;
  /** Whether the minimum order value raised the price. */
  minimumApplied: boolean;
  /** Estimated machine time, for the workshop's own planning. */
  carveMinutes: number;
}

export function priceSign(sign: Sign): PriceBreakdown {
  const wood = getWood(sign.woodId);

  // Material is charged on the rectangular blank the shape is cut from, since
  // that is what leaves the timber merchant.
  const areaDm2 = (sign.widthMm * sign.heightMm) / 10_000;
  const thicknessFactor = sign.thicknessMm / MACHINE.thicknessesMm[0];
  const materialOre = Math.round(areaDm2 * wood.pricePerDm2 * thicknessFactor);

  const carveMinutes = baseCarveMinutes(sign) * wood.machiningFactor;
  const carveOre = Math.round((carveMinutes / 60) * SHOP.hourlyRateOre);

  const finishMinutes = finishingMinutes(sign, areaDm2);
  const finishingOre = Math.round((finishMinutes / 60) * SHOP.hourlyRateOre);

  const setupOre = SHOP.setupFeeOre;
  const extras = extrasOre(sign);

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
 *
 * Always Swedish formatting, in both languages. The price is in kronor and the
 * customer is buying from a Swedish workshop; rendering it with an English
 * thousands separator would be presenting a Swedish invoice in a foreign
 * costume.
 */
export function formatOre(ore: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(ore / 100);
}
