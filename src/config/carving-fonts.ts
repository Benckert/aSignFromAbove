/**
 * The faces offered in the sign designer — the data half.
 *
 * Deliberately free of any `next/font` import. This module is pure data, so
 * the pricing engine, the validation rules and their tests can read it without
 * dragging in the Next.js font loader, which only exists inside the Next
 * compiler. The matching loader lives in `carving-fonts.loader.ts`, and a test
 * asserts the two stay in step.
 *
 * Every face here was chosen because it survives a router bit, and each carries
 * the numbers the designer needs to warn a customer before they order something
 * that cannot be cut cleanly.
 *
 * The selection follows what sign carvers consistently recommend: sturdy
 * sans-serifs and Roman-style serifs whose serifs taper to a point under a
 * V-bit, and away from faces with hairline strokes or tight spacing, where
 * even a small bit is wider than the gap it has to enter.
 *
 * ── On the numbers ────────────────────────────────────────────────────────
 * `strokeRatio` is the narrowest stroke in the face expressed as a fraction of
 * its cap height. It is what decides whether a given bit fits. These values are
 * design-time estimates read off the outlines, not measurements from a
 * production toolpath — good enough to drive an honest warning, and worth
 * re-measuring in CAM once the real bits are known. They are tuned in one
 * place so that is a single edit.
 *
 * `pathFactor` approximates the outline length of one average glyph as a
 * multiple of cap height, and feeds the carve-time half of the price.
 */

export type CarveRating = 'excellent' | 'good' | 'caution';

export interface CarvingFont {
  id: string;
  /** Shown in the picker. Font names are proper nouns — never translated. */
  label: string;
  /** CSS custom property holding the loaded family. */
  variable: string;
  /** Value to put in SVG `font-family`, resolved from the variable at runtime. */
  cssFamily: string;
  category: 'roman' | 'serif' | 'slab' | 'sans' | 'script';
  /** Faces designed as capitals only; the designer upper-cases input for these. */
  capsOnly: boolean;
  /** Narrowest stroke ÷ cap height. Drives the "your bit is too wide" warning. */
  strokeRatio: number;
  /** Average glyph outline length ÷ cap height. Drives the carve-time estimate. */
  pathFactor: number;
  /**
   * Cap height ÷ em size, used to turn a cap height in millimetres into an SVG
   * font-size.
   *
   * Read out of each font file rather than estimated — `node scripts/measure-faces.mjs`
   * reproduces the whole table. They were estimates once, and the estimates
   * were badly wrong: Dancing Script was out by 24 %, Oswald by 11 %, Alfa Slab
   * by 8 %. Since this is the number that turns "40 mm letters" into a font
   * size, a sign asked for in Dancing Script was a quarter smaller than the one
   * the customer specified.
   */
  capRatio: number;
  /**
   * Below this cap height the face stops reading as itself, whatever bit is
   * used. Millimetres.
   *
   * This is a legibility floor, not a physical one — the physical floor comes
   * from `strokeRatio` measured against the cutter, and is applied separately.
   * Because the designer now uses these to bound the size slider rather than to
   * raise a warning, an over-cautious value here quietly removes a size a
   * customer could legitimately have had. They are set to where the face
   * genuinely degrades, not to where it looks its best.
   */
  minCapHeightMm: number;
  suitability: {
    vcarve: CarveRating;
    /** Flat-bottomed pockets cleared with an end mill. */
    pocket: CarveRating;
    /** Background removed so the letters stand proud. */
    raised: CarveRating;
  };
  note: { sv: string; en: string };
}

export const CARVING_FONTS: CarvingFont[] = [
  {
    id: 'cinzel',
    label: 'Cinzel',
    variable: '--carve-cinzel',
    cssFamily: 'var(--carve-cinzel), serif',
    category: 'roman',
    capsOnly: true,
    strokeRatio: 0.085,
    pathFactor: 4.6,
    capRatio: 0.7,
    minCapHeightMm: 16,
    suitability: { vcarve: 'excellent', pocket: 'good', raised: 'good' },
    note: {
      sv: 'Romerska versaler i samma tradition som inskriptionerna på Trajanuskolonnen. Serifernas spetsar följer V-fräsens vinkel och blir knivskarpa — det klassiska valet för en huggen skylt.',
      en: 'Roman capitals in the same tradition as the inscriptions on Trajan’s Column. The serifs taper to the same angle the V-bit cuts at, so they come out knife-sharp — the classic choice for a carved sign.',
    },
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    variable: '--carve-merriweather',
    cssFamily: 'var(--carve-merriweather), serif',
    category: 'serif',
    capsOnly: false,
    strokeRatio: 0.13,
    pathFactor: 4.4,
    capRatio: 0.743,
    minCapHeightMm: 12,
    suitability: { vcarve: 'excellent', pocket: 'excellent', raised: 'good' },
    note: {
      sv: 'Kraftiga streck och stora inneslutna ytor. Tål både V-fräsning och urfräsning ner till små storlekar, och läses bra på håll. En trygg allround-antikva.',
      en: 'Heavy strokes and wide counters. Handles both V-carving and pocketing down to small sizes and stays readable at a distance. A dependable all-rounder.',
    },
  },
  {
    id: 'roboto-slab',
    label: 'Roboto Slab',
    variable: '--carve-slab',
    cssFamily: 'var(--carve-slab), serif',
    category: 'slab',
    capsOnly: false,
    strokeRatio: 0.14,
    pathFactor: 4.2,
    capRatio: 0.711,
    minCapHeightMm: 10,
    suitability: { vcarve: 'good', pocket: 'excellent', raised: 'excellent' },
    note: {
      sv: 'Nästan jämntjocka streck utan hårfina partier, vilket gör den idealisk för urfräsning med platt fräs och för upphöjda bokstäver.',
      en: 'Near-even stroke weight with no hairlines, which makes it ideal for flat-bottomed pockets and for raised lettering.',
    },
  },
  {
    id: 'alfa-slab',
    label: 'Alfa Slab One',
    variable: '--carve-alfa',
    cssFamily: 'var(--carve-alfa), serif',
    category: 'slab',
    capsOnly: false,
    strokeRatio: 0.2,
    pathFactor: 3.9,
    capRatio: 0.778,
    minCapHeightMm: 8,
    suitability: { vcarve: 'good', pocket: 'excellent', raised: 'excellent' },
    note: {
      sv: 'Den tyngsta stilen i urvalet. Så breda streck att bakgrunden kan fräsas bort helt och bokstäverna står kvar i massivt trä — bäst för upphöjd text.',
      en: 'The heaviest face on offer. The strokes are wide enough to clear the background away entirely and leave the letters standing in solid timber — best for raised text.',
    },
  },
  {
    id: 'oswald',
    label: 'Oswald',
    variable: '--carve-oswald',
    cssFamily: 'var(--carve-oswald), sans-serif',
    category: 'sans',
    capsOnly: false,
    strokeRatio: 0.14,
    pathFactor: 3.4,
    capRatio: 0.81,
    minCapHeightMm: 10,
    suitability: { vcarve: 'excellent', pocket: 'excellent', raised: 'good' },
    note: {
      sv: 'Smal och hög. Får plats med långa namn på en smal bräda utan att bokstäverna behöver krympa.',
      en: 'Narrow and tall. Fits a long name on a narrow board without shrinking the letters.',
    },
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    variable: '--carve-bebas',
    cssFamily: 'var(--carve-bebas), sans-serif',
    category: 'sans',
    capsOnly: true,
    strokeRatio: 0.13,
    pathFactor: 3.2,
    capRatio: 0.7,
    minCapHeightMm: 8,
    suitability: { vcarve: 'excellent', pocket: 'excellent', raised: 'good' },
    note: {
      sv: 'Kompakta versaler utan utsmyckning. Den mest utrymmeseffektiva stilen här och läsbar även i liten skala.',
      en: 'Compact capitals with nothing extra. The most space-efficient face here, and legible even at small sizes.',
    },
  },
  {
    id: 'baskerville',
    label: 'Libre Baskerville',
    variable: '--carve-baskerville',
    cssFamily: 'var(--carve-baskerville), serif',
    category: 'serif',
    capsOnly: false,
    strokeRatio: 0.09,
    pathFactor: 4.5,
    capRatio: 0.77,
    minCapHeightMm: 15,
    suitability: { vcarve: 'excellent', pocket: 'caution', raised: 'caution' },
    note: {
      sv: 'Boksidans antikva, med tydlig skillnad mellan tjocka och tunna streck. Vacker V-fräst i större storlek, men de tunna partierna är för smala för att fräsas ur platt.',
      en: 'A book serif with a clear contrast between thick and thin strokes. Beautiful V-carved at a decent size, but the thin strokes are too narrow to pocket flat.',
    },
  },
  {
    id: 'dancing',
    label: 'Dancing Script',
    variable: '--carve-dancing',
    cssFamily: 'var(--carve-dancing), cursive',
    category: 'script',
    capsOnly: false,
    strokeRatio: 0.07,
    pathFactor: 5.2,
    capRatio: 0.72,
    minCapHeightMm: 22,
    suitability: { vcarve: 'good', pocket: 'caution', raised: 'caution' },
    note: {
      sv: 'Sammanbunden skrivstil. Fungerar V-fräst om texten får vara stor — bokstäverna löper ihop, så små storlekar blir grötiga.',
      en: 'A joined-up script. Works V-carved if the text is allowed to be large — the letters run together, so small sizes turn muddy.',
    },
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    variable: '--carve-playfair',
    cssFamily: 'var(--carve-playfair), serif',
    category: 'serif',
    capsOnly: false,
    strokeRatio: 0.045,
    pathFactor: 4.7,
    capRatio: 0.708,
    minCapHeightMm: 30,
    suitability: { vcarve: 'good', pocket: 'caution', raised: 'caution' },
    note: {
      sv: 'Hög kontrast med riktigt hårfina streck. Tas med för att den är efterfrågad, men den kräver stora bokstäver och en spetsig fräs — annars försvinner de tunna partierna helt.',
      en: 'High contrast with genuinely hairline strokes. Included because people ask for it, but it needs large letters and a sharp bit — otherwise the thin strokes disappear altogether.',
    },
  },
];

export const DEFAULT_FONT_ID = 'cinzel';

export function getFont(id: string): CarvingFont {
  return CARVING_FONTS.find((f) => f.id === id) ?? CARVING_FONTS[0];
}
