/**
 * Timber offered for signs.
 *
 * Species are the ones a Swedish workshop can actually get hold of, with
 * walnut as the one import. Each entry carries the colours the live preview
 * paints with and the numbers the price is built from.
 *
 * ── On hardness ───────────────────────────────────────────────────────────
 * Hardness is given as a plain description rather than a Janka figure. Janka
 * numbers for European species vary a lot between sources and testing
 * standards, and publishing a precise-looking figure that turns out to be wrong
 * is worse than saying "hard" and meaning it. `machiningFactor` below is a
 * separate internal number that only affects estimated cutting time.
 */

export type WoodId = 'furu' | 'al' | 'bjork' | 'ask' | 'ek' | 'lonn' | 'valnot';

export interface Wood {
  id: WoodId;
  name: { sv: string; en: string };
  /** Botanical name — identical in both languages, shown as a quiet subtitle. */
  latin: string;
  /** Colours driving the procedural grain in the preview. */
  colour: {
    base: string;
    /** Lighter earlywood bands. */
    light: string;
    /** Darker latewood bands and the shadow inside a cut. */
    dark: string;
  };
  /** How pronounced the grain figure is, 0–1. Feeds the texture amplitude. */
  grainStrength: number;
  hardness: { sv: string; en: string };
  /** Material cost in öre per dm², at the 20 mm reference thickness, ex VAT. */
  pricePerDm2: number;
  /** Cutting-time multiplier. Harder timber is fed slower. */
  machiningFactor: number;
  /** Whether the workshop will sell it for an exposed outdoor sign. */
  outdoorSuitable: boolean;
  note: { sv: string; en: string };
}

export const WOODS: Wood[] = [
  {
    id: 'furu',
    name: { sv: 'Furu', en: 'Pine' },
    latin: 'Pinus sylvestris',
    colour: { base: '#e3c89a', light: '#f0dab6', dark: '#bf9558' },
    grainStrength: 0.85,
    hardness: { sv: 'Mjuk', en: 'Soft' },
    pricePerDm2: 1400,
    machiningFactor: 0.9,
    outdoorSuitable: true,
    note: {
      sv: 'Ljus och levande med tydliga årsringar och kvistar. Billigast av alla och helt ärligt trä — men mjukt, så fina detaljer blir aldrig lika skarpa som i ett hårdare slag.',
      en: 'Pale and lively, with clear growth rings and knots. The cheapest option and an honest timber — but soft, so fine detail never comes out as crisp as it does in a harder species.',
    },
  },
  {
    id: 'al',
    name: { sv: 'Al', en: 'Alder' },
    latin: 'Alnus glutinosa',
    colour: { base: '#deb694', light: '#ebcaae', dark: '#b9855c' },
    grainStrength: 0.4,
    hardness: { sv: 'Mjuk', en: 'Soft' },
    pricePerDm2: 1800,
    machiningFactor: 0.85,
    outdoorSuitable: false,
    note: {
      sv: 'Jämn, nästan flammig ton utan att grenen tar över. Fräser sig ovanligt rent för att vara mjukt, vilket gör den till ett bra val när texten är liten. Inomhus.',
      en: 'An even, faintly flamed tone that never fights the lettering. Cuts unusually cleanly for a soft timber, which makes it a good choice when the text is small. Indoors only.',
    },
  },
  {
    id: 'bjork',
    name: { sv: 'Björk', en: 'Birch' },
    latin: 'Betula pendula',
    colour: { base: '#ead9bd', light: '#f6ead3', dark: '#c9b085' },
    grainStrength: 0.3,
    hardness: { sv: 'Medelhård', en: 'Medium' },
    pricePerDm2: 2200,
    machiningFactor: 1.0,
    outdoorSuitable: false,
    note: {
      sv: 'Tät och finfibrig med nästan osynlig ådring. Den ljusaste ytan i urvalet och den som håller finast kanter — välj den när skylten har mycket text. Inomhus.',
      en: 'Dense and fine-fibred, with almost invisible grain. The palest surface here and the one that holds the finest edges — choose it when the sign carries a lot of text. Indoors only.',
    },
  },
  {
    id: 'ask',
    name: { sv: 'Ask', en: 'Ash' },
    latin: 'Fraxinus excelsior',
    colour: { base: '#e5d5b7', light: '#f1e5cb', dark: '#bda57c' },
    grainStrength: 0.95,
    hardness: { sv: 'Hård', en: 'Hard' },
    pricePerDm2: 3000,
    machiningFactor: 1.15,
    outdoorSuitable: false,
    note: {
      sv: 'Ljus botten med kraftig, rak ådring som ger skylten rörelse. Sega fibrer som klarar en tydlig fasad kant utan att flisa. Inomhus.',
      en: 'A pale ground with strong, straight grain that gives the sign movement. Tough fibres that take a crisp chamfered edge without chipping. Indoors only.',
    },
  },
  {
    id: 'ek',
    name: { sv: 'Ek', en: 'Oak' },
    latin: 'Quercus robur',
    colour: { base: '#d2ae7b', light: '#e2c495', dark: '#a67c47' },
    grainStrength: 1,
    hardness: { sv: 'Hård', en: 'Hard' },
    pricePerDm2: 3600,
    machiningFactor: 1.25,
    outdoorSuitable: true,
    note: {
      sv: 'Det trä de flesta menar när de säger att något ska hålla. Öppna porer, varm ton och en kärnved som klarar sig ute i decennier obehandlad. Tyngst att fräsa, och värt det.',
      en: 'The timber most people mean when they say something should last. Open pores, a warm tone, and a heartwood that survives outdoors untreated for decades. The heaviest to cut, and worth it.',
    },
  },
  {
    id: 'lonn',
    name: { sv: 'Lönn', en: 'Maple' },
    latin: 'Acer platanoides',
    colour: { base: '#eddfc4', light: '#f7edd9', dark: '#cdb992' },
    grainStrength: 0.25,
    hardness: { sv: 'Hård', en: 'Hard' },
    pricePerDm2: 3200,
    machiningFactor: 1.2,
    outdoorSuitable: false,
    note: {
      sv: 'Nästan gräddvit och mycket jämn. Hårt nog att bära hårfina serifer, vilket gör den till det enda riktigt trygga underlaget för de finaste stilarna. Inomhus.',
      en: 'Almost cream-white and very even. Hard enough to carry hairline serifs, which makes it the one genuinely safe ground for the finest faces here. Indoors only.',
    },
  },
  {
    id: 'valnot',
    name: { sv: 'Valnöt', en: 'Walnut' },
    latin: 'Juglans regia',
    colour: { base: '#7e5a3c', light: '#98734f', dark: '#513824' },
    grainStrength: 0.7,
    hardness: { sv: 'Medelhård', en: 'Medium' },
    pricePerDm2: 6500,
    machiningFactor: 1.1,
    outdoorSuitable: false,
    note: {
      sv: 'Mörk, chokladbrun och den enda importen i listan. En ljus text mot valnöt är den mest kontrastrika kombinationen som går att göra utan färg. Dyrast — och det syns. Inomhus.',
      en: 'Dark, chocolate-brown, and the one import on this list. Light lettering against walnut is the strongest contrast achievable without any paint at all. The most expensive — and it shows. Indoors only.',
    },
  },
];

export const DEFAULT_WOOD: WoodId = 'ek';

export function getWood(id: string): Wood {
  return WOODS.find((w) => w.id === id) ?? WOODS[0];
}
