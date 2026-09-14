import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, type Font } from 'opentype.js';
import { CARVING_FONTS } from '@/config/carving-fonts';
import { capRatio, outlineBlock, toLines } from './outline';

/**
 * These run against the real font files in public/fonts, not against fixtures.
 *
 * That is the point of the exercise: the whole reason for moving to outlines is
 * that the previous code guessed at what the faces would do, so a test that
 * guessed alongside it would have agreed with every one of its mistakes.
 */
const FACES = new Map<string, Font>();

function face(id: string): Font {
  const cached = FACES.get(id);
  if (cached) return cached;
  const file = readFileSync(join(process.cwd(), 'public', 'fonts', `${id}.ttf`));
  // Node's Buffer is a view on a pooled ArrayBuffer; slice to get just this file.
  const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  FACES.set(id, font);
  return font;
}

const block = (id: string, text: string, capHeightMm = 40) =>
  outlineBlock(face(id), {
    text,
    capHeightMm,
    trackingEm: 0,
    lineSpacing: 1.5,
    align: 'center',
  });

describe('the vendored faces', () => {
  it('has a file for every face in the catalogue', () => {
    // The picker and the outline layer must agree on what exists, or choosing a
    // face would blank the board.
    for (const font of CARVING_FONTS) {
      expect(() => face(font.id)).not.toThrow();
    }
  });

  it('can set every face without falling over', () => {
    // opentype's own shaping engine throws on several of these; the per-glyph
    // layout exists precisely so that it cannot.
    for (const font of CARVING_FONTS) {
      expect(block(font.id, 'Björkhaga ÅÄÖ')?.d.length ?? 0).toBeGreaterThan(100);
    }
  });

  it('reads a plausible cap height from each one', () => {
    for (const font of CARVING_FONTS) {
      const ratio = capRatio(face(font.id));
      expect(ratio).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(0.9);
    }
  });
});

describe('cap height', () => {
  it('is exactly what was asked for', () => {
    /*
      The promise the whole designer rests on: 40 mm on the slider puts the top
      of a capital exactly 40 mm above its baseline, in every face.

      Stated as the top of the H rather than the height of the H, because in
      Dancing Script the H carries a flourish that drops below the baseline —
      so its *ink* is 45 mm tall while its capital is 40 mm, exactly as a
      signwriter would describe it.
    */
    for (const font of CARVING_FONTS) {
      const out = block(font.id, 'H', 40);
      expect(out).not.toBeNull();
      expect(`${font.id}: ${out!.box.y.toFixed(2)}`).toBe(`${font.id}: -40.00`);
    }
  });

  it('is not the same thing as the height of the ink', () => {
    /*
      Worth stating as a test because assuming otherwise is what the old code
      did. A round letter overshoots the cap line at the top and the baseline at
      the bottom, so that it does not *look* smaller than a flat one — Cinzel's
      E and T rise 2.7 % above its H, and its O dips 1.4 % below the baseline.
      The number on the slider is the cap height, because that is what a sign
      maker means by "40 mm letters". The ink box is what the layout has to
      keep inside the board, and it is always the larger of the two.
    */
    const capital = block('cinzel', 'H', 40)!;
    const word = block('cinzel', 'HEM', 40)!;
    expect(word.box.height).toBeGreaterThan(capital.box.height);
    // Overshoot, not a different size: a few per cent, not tens.
    expect(word.box.height).toBeLessThan(44);
  });

  it('scales linearly', () => {
    const small = block('baskerville', 'HEM', 20)!;
    const large = block('baskerville', 'HEM', 60)!;
    expect(large.box.width / small.box.width).toBeCloseTo(3, 2);
  });
});

describe('the measured box', () => {
  it('grows for a descender', () => {
    const flat = block('baskerville', 'HEM')!;
    // A lowercase p, not the capital: P does not descend in any of these faces.
    const tail = block('baskerville', 'HEMp')!;
    expect(tail.box.height).toBeGreaterThan(flat.box.height + 5);
  });

  it('grows for an accent', () => {
    // This is the bug that put the dots of an Ö through a customer's border.
    // The old code reserved a fixed 22 % above every capital whether the word
    // needed it or not; this asks the word.
    const plain = block('cinzel', 'HO')!;
    const accented = block('cinzel', 'HÖ')!;
    expect(accented.box.height).toBeGreaterThan(plain.box.height);
    expect(accented.box.y).toBeLessThan(plain.box.y);
  });

  it('reserves nothing for an accent that is not there', () => {
    /*
      The other half of the bargain, and the reason to measure at all. The old
      code added 22 % of the cap height above every block whether the word had
      anything up there or not, which cost eight millimetres of letter on a
      sign reading STUGAN. What is left here is overshoot alone.
    */
    const plain = block('cinzel', 'STUGAN', 40)!;
    expect(plain.box.height).toBeLessThan(42);

    const accented = block('cinzel', 'STUGÅN', 40)!;
    expect(accented.box.height).toBeGreaterThan(plain.box.height + 4);
  });

  it('sits above the baseline', () => {
    // y is negative upward in SVG, and the first baseline is the origin.
    const out = block('oswald', 'HEM')!;
    expect(out.box.y).toBeLessThan(0);
    expect(out.box.y + out.box.height).toBeLessThanOrEqual(0.01);
  });
});

describe('multiple lines', () => {
  it('stacks them by the line spacing', () => {
    const one = block('baskerville', 'HEM', 40)!;
    const two = block('baskerville', 'HEM\nHEM', 40)!;
    // One extra baseline at 1.5 × 40 mm below the first.
    expect(two.box.height - one.box.height).toBeCloseTo(60, 1);
  });

  it('is as wide as its widest line', () => {
    const wide = block('baskerville', 'BJÖRKHAGA', 40)!;
    const both = block('baskerville', 'BJÖRKHAGA\nHEM', 40)!;
    expect(both.box.width).toBeCloseTo(wide.box.width, 1);
  });

  it('centres a short line against a long one', () => {
    const out = block('baskerville', 'BJÖRKHAGA\nHEM', 40)!;
    const left = outlineBlock(face('baskerville'), {
      text: 'BJÖRKHAGA\nHEM',
      capHeightMm: 40,
      trackingEm: 0,
      lineSpacing: 1.5,
      align: 'left',
    })!;
    // Centring cannot change the block's overall width, only what is inside it.
    expect(out.box.width).toBeCloseTo(left.box.width, 1);
    expect(out.d).not.toBe(left.d);
  });
});

describe('tracking', () => {
  it('widens a line without changing its height', () => {
    const tight = block('cinzel', 'HEM')!;
    const loose = outlineBlock(face('cinzel'), {
      text: 'HEM',
      capHeightMm: 40,
      trackingEm: 0.2,
      lineSpacing: 1.5,
      align: 'center',
    })!;
    expect(loose.box.width).toBeGreaterThan(tight.box.width);
    expect(loose.box.height).toBeCloseTo(tight.box.height, 2);
  });

  it('does not hang tracking off the end of the line', () => {
    // A trailing gap would push a centred line off its own centre.
    const out = outlineBlock(face('cinzel'), {
      text: 'HEM',
      capHeightMm: 40,
      trackingEm: 0.5,
      lineSpacing: 1.5,
      align: 'center',
    })!;
    expect(Math.abs(out.box.x + out.box.width / 2)).toBeLessThan(out.box.width);
  });
});

describe('empty input', () => {
  it('returns nothing to draw', () => {
    expect(block('cinzel', '')).toBeNull();
    expect(block('cinzel', '   ')).toBeNull();
    expect(block('cinzel', '\n\n')).toBeNull();
  });
});

describe('toLines', () => {
  it('keeps interior blanks and drops trailing ones', () => {
    expect(toLines('a\n\nb\n\n')).toEqual(['a', '', 'b']);
    expect(toLines('a')).toEqual(['a']);
  });
});
