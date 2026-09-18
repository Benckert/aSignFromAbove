/**
 * The slice of opentype.js this project uses.
 *
 * The package ships no type definitions, and the community ones on DefinitelyTyped
 * describe a wider surface than we touch. Declaring the handful of members used
 * here keeps the contract visible: if a future version moves one of them, the
 * build says so rather than failing at runtime in a customer's browser.
 *
 * Named exports only. The CommonJS build carries a default as well, so an
 * `import opentype from` compiles and runs under Node — and then fails in the
 * browser, where the bundler resolves the ES module, which has none.
 */
declare module 'opentype.js' {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export class Path {
    /**
     * The commands making up the path. Read directly, because this project
     * writes its own path data — see `toPathData` in lib/sign/outline.ts for
     * the bug in the bundled serialiser that made that necessary.
     */
    commands: unknown[];
    /** Smallest box containing the path. Empty paths return all zeroes. */
    getBoundingBox(): BoundingBox;
    /** Appends another path's commands to this one. */
    extend(path: Path): void;
  }

  export class Glyph {
    /** Pen advance for this glyph, in font units. */
    advanceWidth: number;
    /** Outline placed with its baseline origin at (x, y), at the given size. */
    getPath(x: number, y: number, fontSize: number): Path;
    getBoundingBox(): BoundingBox;
  }

  export class Font {
    /** Font units per em — the space glyph coordinates are expressed in. */
    unitsPerEm: number;
    charToGlyph(char: string): Glyph;
    /** Kerning between two glyphs, in font units. Zero when the pair is unkerned. */
    getKerningValue(left: Glyph, right: Glyph): number;
  }

  /** Parses a font file. Throws on anything that is not one. */
  export function parse(buffer: ArrayBuffer): Font;
}
