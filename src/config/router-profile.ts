/**
 * Machine, tooling and shop-rate assumptions.
 *
 * DEVELOPMENT VALUES — NOT THE REAL WORKSHOP'S FIGURES
 * Every number in this file is a placeholder standing in for the real
 * workshop's figures, which were not available when the site was built. They
 * are realistic rather than arbitrary — a hobby-to-prosumer CNC router, common
 * bit sizes, conservative feeds — but they are assumptions.
 *
 * They are gathered here, and nowhere else, so that replacing them with the
 * real machine's numbers is a single edit to a single file. Nothing downstream
 * hard-codes a feed rate, a bit diameter or an hourly rate; the price engine
 * and the "will this cut?" warnings both read from here.
 *
 * When the real specs arrive, update:
 *   1. `BITS`            — the bits actually owned, with real tip geometry.
 *   2. `MACHINE`         — real working area and the feeds actually run.
 *   3. `SHOP`            — real hourly rate, setup time and minimum order.
 *   4. `carving-fonts.ts` → `strokeRatio`, re-measured in CAM.
 */

/** A cutter in the rack. */
export interface Bit {
  id: string;
  label: string;
  /** Included angle in degrees for V-bits; null for straight cutters. */
  angleDeg: number | null;
  /** Shank/cutting diameter in mm. */
  diameterMm: number;
  /**
   * The narrowest stroke this bit can bottom out in, in mm.
   * A V-bit comes to a point, so it can enter almost anything and the limit is
   * practical rather than geometric. A straight cutter cannot cut a slot
   * narrower than its own diameter.
   */
  minStrokeMm: number;
  use: 'vcarve' | 'clearing' | 'profile';
}

export const BITS: Bit[] = [
  { id: 'v60', label: '60° V', angleDeg: 60, diameterMm: 12.7, minStrokeMm: 0.8, use: 'vcarve' },
  { id: 'v90', label: '90° V', angleDeg: 90, diameterMm: 12.7, minStrokeMm: 1.2, use: 'vcarve' },
  {
    id: 'em3',
    label: '3,175 mm (1/8″)',
    angleDeg: null,
    diameterMm: 3.175,
    minStrokeMm: 3.175,
    use: 'clearing',
  },
  {
    id: 'em6',
    label: '6,35 mm (1/4″)',
    angleDeg: null,
    diameterMm: 6.35,
    minStrokeMm: 6.35,
    use: 'clearing',
  },
  {
    id: 'em6profile',
    label: '6,35 mm profil',
    angleDeg: null,
    diameterMm: 6.35,
    minStrokeMm: 6.35,
    use: 'profile',
  },
];

export const MACHINE = {
  /** Largest blank the machine can hold, in mm. Caps the size sliders. */
  workAreaMm: { width: 1200, height: 600 },
  /** Smallest sign the workshop will take on. */
  minSignMm: { width: 100, height: 60 },
  /** Thicknesses kept in stock, in mm. The first is the pricing reference. */
  thicknessesMm: [20, 27, 40] as const,
  /**
   * Effective feed rates in mm/min, already discounted for acceleration on
   * short moves — a nominal 3000 mm/min machine rarely averages half that on
   * lettering.
   */
  feedMmPerMin: { vcarve: 1100, clearing: 2400, profile: 1600 },
  /** Depth removed per pass, in mm. */
  passDepthMm: 3,
  /** Fraction of bit diameter stepped over when clearing an area. */
  stepover: 0.45,
  /** Typical carve depth for engraved lettering, in mm. */
  carveDepthMm: 4,
  /** Depth the background drops for raised lettering, in mm. */
  reliefDepthMm: 5,
} as const;

export const SHOP = {
  /**
   * Shop rate in öre per hour, ex VAT. All money in this codebase is integer
   * öre — 65 000 öre is 650 kr — so that a price never drifts through floating
   * point before it is shown to a customer.
   */
  hourlyRateOre: 70_000,
  /**
   * Fixed charge covering drawing preparation, CAM programming, squaring the
   * blank and tool setup. Independent of sign size.
   */
  setupFeeOre: 35_000,
  /** No job is taken below this, ex VAT. */
  minimumOrderOre: 45_000,
  /** Sanding and general handling, in minutes per dm² of face area. */
  finishingMinutesPerDm2: 1.2,
  /** Extra minutes when the customer supplies their own artwork to vectorise. */
  artworkSetupMinutes: 25,
} as const;

/** Rounds a price up to the nearest whole 10 kr so nothing shows as 1 247 kr. */
export const PRICE_ROUNDING_ORE = 1_000;
