import type { WoodId } from '@/config/woods';

/**
 * The furniture shown in the gallery.
 *
 * This is the whole content source — there is no CMS, because a one-person
 * workshop finishing a dozen pieces a year does not need one, and a file in the
 * repository cannot go down, cost a subscription, or need updating.
 *
 * To add a piece: drop the photographs into `public/furniture/` and add an
 * entry below. Set `images` to their paths, in the order they should appear;
 * the first is the one used on the card.
 *
 * A piece with an empty `images` array renders a placeholder rather than a
 * broken frame, which is what every entry does today — these are here so the
 * gallery can be seen working and so the shape of an entry is obvious. Replace
 * them with real work before the site goes live.
 */

export type PieceKind = 'table' | 'seating' | 'storage' | 'bed' | 'other';

export interface Piece {
  id: string;
  title: { sv: string; en: string };
  kind: PieceKind;
  year: number;
  woods: WoodId[];
  /** Width × depth × height, in millimetres. Omit any that does not apply. */
  sizeMm: { w?: number; d?: number; h?: number };
  finish: { sv: string; en: string };
  /** Who it was made for — a room, a family, a business. Never a real name. */
  forWhom: { sv: string; en: string };
  /** A few sentences on what the problem was and how it was solved. */
  story: { sv: string; en: string };
  /** Paths under /public. Empty means the placeholder is drawn instead. */
  images: string[];
}

export const PIECES: Piece[] = [
  {
    id: 'matbord-ek',
    title: { sv: 'Matbord i ek', en: 'Oak dining table' },
    kind: 'table',
    year: 2025,
    woods: ['ek'],
    sizeMm: { w: 2200, d: 950, h: 740 },
    finish: { sv: 'Hårdvaxolja', en: 'Hardwax oil' },
    forWhom: { sv: 'En familj i Uppsala', en: 'A family in Uppsala' },
    story: {
      sv: 'Köket var långsmalt, så skivan vilar på två indragna bockar istället för ben i hörnen — då går det att sitta även på kortsidorna. Limmad av fem plankor ur samma stock, så ådringen löper obruten.',
      en: 'The kitchen was long and narrow, so the top rests on two inboard trestles rather than legs at the corners — which lets people sit at the ends too. Glued up from five boards out of one log, so the grain runs unbroken.',
    },
    images: [],
  },
  {
    id: 'bokhylla-ask',
    title: { sv: 'Bokhylla i ask', en: 'Ash bookcase' },
    kind: 'storage',
    year: 2025,
    woods: ['ask'],
    sizeMm: { w: 1800, d: 320, h: 2100 },
    finish: { sv: 'Såpa', en: 'Soap finish' },
    forWhom: { sv: 'Ett arbetsrum i en 20-talsvåning', en: 'A study in a 1920s flat' },
    story: {
      sv: 'Väggen lutade nästan två centimeter, vilket är normalt i ett hus från tjugotalet. Hyllan är byggd efter väggen istället för tvärtom, så den står tätt utan lister som döljer springan.',
      en: 'The wall leaned by nearly two centimetres, which is normal in a house of that age. The bookcase is built to follow the wall rather than fight it, so it sits tight without a moulding hiding the gap.',
    },
    images: [],
  },
  {
    id: 'skankskap-valnot',
    title: { sv: 'Skänkskåp i valnöt', en: 'Walnut sideboard' },
    kind: 'storage',
    year: 2024,
    woods: ['valnot', 'ek'],
    sizeMm: { w: 1600, d: 450, h: 780 },
    finish: { sv: 'Hårdvaxolja', en: 'Hardwax oil' },
    forWhom: { sv: 'En matsal utanför Sigtuna', en: 'A dining room outside Sigtuna' },
    story: {
      sv: 'Fronter i valnöt på en stomme av ek — dels vackrare, dels för att ett helt skåp i valnöt hade kostat mer än uppdraget tålde. Dörrarna är urfrästa på undersidan istället för att ha handtag.',
      en: 'Walnut fronts on an oak carcass — partly better looking, partly because a sideboard entirely in walnut would have cost more than the job could bear. The doors are routed away underneath instead of having handles.',
    },
    images: [],
  },
  {
    id: 'pall-bjork',
    title: { sv: 'Pallar i björk', en: 'Birch stools' },
    kind: 'seating',
    year: 2024,
    woods: ['bjork'],
    sizeMm: { w: 340, d: 300, h: 450 },
    finish: { sv: 'Obehandlad', en: 'Untreated' },
    forWhom: { sv: 'Ett kafé i Gamla stan', en: 'A café in Gamla stan' },
    story: {
      sv: 'Åtta stycken, avsedda att slitas. Benen är kilade genom sitsen ovanifrån — den enda infästning som blir starkare ju mer man sätter sig på den.',
      en: 'Eight of them, meant to be worn out. The legs are wedged through the seat from above — the one joint that gets tighter the more people sit on it.',
    },
    images: [],
  },
  {
    id: 'sang-furu',
    title: { sv: 'Säng i furu', en: 'Pine bed' },
    kind: 'bed',
    year: 2024,
    woods: ['furu'],
    sizeMm: { w: 1600, d: 2100, h: 900 },
    finish: { sv: 'Vitpigmenterad olja', en: 'White-pigmented oil' },
    forWhom: { sv: 'Ett sovrum i en sommarstuga', en: 'A bedroom in a summer house' },
    story: {
      sv: 'Sängen skulle bäras in genom en dörr som var 68 centimeter bred. Den är byggd i fyra delar som hakas ihop utan verktyg och hålls samman av sin egen tyngd. Ingen skruv.',
      en: 'The bed had to come in through a door 68 centimetres wide. It is built in four parts that hook together without tools and are held by their own weight. Not a screw in it.',
    },
    images: [],
  },
  {
    id: 'skrivbord-lonn',
    title: { sv: 'Skrivbord i lönn', en: 'Maple desk' },
    kind: 'table',
    year: 2023,
    woods: ['lonn', 'ek'],
    sizeMm: { w: 1400, d: 700, h: 730 },
    finish: { sv: 'Hårdvaxolja', en: 'Hardwax oil' },
    forWhom: { sv: 'En översättare', en: 'A translator' },
    story: {
      sv: 'Enda kraven var att inget skulle vara i vägen för knäna och att ytan skulle vara ljus nog att läsa korrektur vid. Lönn är det ljusaste av de hårda slagen.',
      en: 'The only requirements were that nothing be in the way of the knees, and that the surface be pale enough to read proofs on. Maple is the palest of the hard timbers.',
    },
    images: [],
  },
];

export const PIECE_KINDS: PieceKind[] = ['table', 'seating', 'storage', 'bed', 'other'];
