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
      sv: 'Köket var långsmalt och det gick inte att komma runt ett bord med ben i hörnen. Skivan vilar därför på två bockar som står indragna en bit, så att man kan sitta även på kortsidorna. Skivan är limmad av fem plankor ur samma stock, vilket gör att ådringen löper obruten över hela längden.',
      en: 'The kitchen was long and narrow, and there was no getting round a table with legs at its corners. The top instead rests on two trestles set well inboard, so people can sit at the ends as well. The top is glued up from five boards out of the same log, which lets the grain run unbroken along its whole length.',
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
      sv: 'Väggen lutade nästan två centimeter på höjden, vilket är helt normalt i ett hus från den tiden. Hyllan är byggd efter väggen istället för tvärtom, så den står tätt utan lister som döljer springan. Sidorna är genomgående och hyllplanen infällda i spår.',
      en: 'The wall leaned by nearly two centimetres over its height, which is entirely normal in a house of that age. The bookcase is built to follow the wall rather than fight it, so it sits tight without a scribe moulding hiding the gap. The sides run full height with the shelves housed into trenches.',
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
      sv: 'Fronterna är av valnöt och stommen av ek, dels för att det blev vackrare, dels för att ett helt skåp i valnöt hade kostat mer än vad uppdraget tålde. Dörrarna har ingen handtag — de är urfrästa på undersidan så att man tar tag i själva dörren.',
      en: 'The fronts are walnut and the carcass oak, partly because it looked better that way and partly because a sideboard entirely in walnut would have cost more than the job could bear. The doors have no handles; they are routed away underneath so you take hold of the door itself.',
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
      sv: 'Åtta stycken, avsedda att slitas. Björk för att det är hårt nog att tåla en kafélokal och billigt nog att göra åtta av. Benen är kilade genom sitsen ovanifrån, vilket är den enda infästning som blir starkare ju mer man sätter sig på den.',
      en: 'Eight of them, meant to be worn out. Birch because it is hard enough for a café floor and cheap enough to make eight of. The legs are wedged through the seat from above, which is the one joint that gets tighter the more people sit on it.',
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
      sv: 'Sängen skulle kunna bäras in genom en dörr som var 68 centimeter bred. Den är därför byggd i fyra delar som hakas ihop utan verktyg och hålls samman av sin egen tyngd. Ingen skruv i hela sängen.',
      en: 'The bed had to come in through a door 68 centimetres wide. So it is built in four parts that hook together without tools and are held by their own weight. There is not a screw in it.',
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
      sv: 'Beställarens enda krav var att det inte skulle finnas något i vägen för knäna, och att bordet skulle vara ljust nog att läsa korrektur vid i dagsljus. Lönn är det ljusaste av de hårda slagen. Lådan under skivan går att dra ut från båda sidor.',
      en: 'The only requirements were that nothing should be in the way of the sitter’s knees, and that the surface be pale enough to read proofs on in daylight. Maple is the palest of the hard timbers. The drawer under the top pulls out from either side.',
    },
    images: [],
  },
];

export const PIECE_KINDS: PieceKind[] = ['table', 'seating', 'storage', 'bed', 'other'];
