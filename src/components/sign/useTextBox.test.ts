import { describe, expect, it } from 'vitest';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import { defaultDraft, safeArea, type Draft } from '@/lib/sign/draft';
import type { LetteringSize } from '@/lib/sign/store';
import { capLimits, MIN_CAP_MM } from './useTextBox';

/**
 * What can be tested without a browser, which is now most of what matters.
 *
 * The measuring itself belongs to the renderer and is checked against a real
 * one; what is checked here is the arithmetic built on top of the measurement,
 * because that is where a wrong answer becomes a sign that does not fit the
 * board.
 */

const board = (over: Partial<Draft> = {}): Draft => ({ ...defaultDraft(), ...over });
const measured = (widthMm: number, heightMm: number, capMm: number): LetteringSize => ({
  widthMm,
  heightMm,
  capMm,
  offsetXMm: 0,
  offsetYMm: 0,
});

describe('the smallest letters offered', () => {
  it('comes from the narrowest stroke the face has', () => {
    // 0.8 mm is the finest cut on offer; a face whose thin strokes are a
    // twelfth of its cap height therefore needs a ten-millimetre capital
    // before the bit can enter them at all.
    const draft = board();
    expect(getFont(draft.block.fontId).id).toBe('cinzel');
    expect(capLimits(draft, null).min).toBe(Math.ceil(0.8 / 0.085));
  });

  it('never goes below the floor, however fat the face', () => {
    // Alfa Slab's strokes are a fifth of its cap height, which works out at
    // four millimetres — smaller than anything worth carving.
    const draft = board({ block: { ...defaultDraft().block, fontId: 'alfa-slab' } });
    expect(capLimits(draft, null).min).toBe(MIN_CAP_MM);
  });

  it('is a real number for every face in the catalogue', () => {
    for (const font of CARVING_FONTS) {
      const draft = board({ block: { ...defaultDraft().block, fontId: font.id } });
      const { min } = capLimits(draft, null);
      expect(Number.isInteger(min)).toBe(true);
      expect(min).toBeGreaterThanOrEqual(MIN_CAP_MM);
      expect(min).toBeLessThan(40);
    }
  });
});

describe('the largest letters that still fit', () => {
  const draft = board();
  const safe = safeArea(draft);

  it('is generous before anything has been measured', () => {
    // The stepper must not be pinned to the floor for the one frame before the
    // first measurement lands.
    expect(capLimits(draft, null).max).toBeGreaterThan(100);
  });

  it('leaves a block that exactly fills the safe area where it is', () => {
    expect(capLimits(draft, measured(safe.width, 40, 50)).max).toBe(50);
  });

  it('scales from the size the measurement was taken at', () => {
    /*
      The whole reason the cap height travels with the box. Half as wide at the
      same cap height means twice the cap height will fit — and reading the cap
      out of the draft instead would pair this box with whatever size the
      lettering had been changed to since, which is how a block ends up
      snapping to a size nobody chose.
    */
    expect(capLimits(draft, measured(safe.width / 2, 40, 50)).max).toBe(100);
    expect(capLimits(draft, measured(safe.width / 2, 40, 25)).max).toBe(50);
  });

  it('is decided by whichever way round the board runs out first', () => {
    // Wide and short: the width binds. Narrow and tall: the height does.
    expect(capLimits(draft, measured(safe.width, safe.height / 4, 40)).max).toBe(40);
    expect(capLimits(draft, measured(safe.width / 4, safe.height, 40)).max).toBe(40);
    expect(capLimits(draft, measured(safe.width / 4, safe.height / 4, 40)).max).toBe(160);
  });

  it('never drops below the smallest letters on offer', () => {
    // A board this small cannot hold the word at any size the bit can cut, and
    // the answer has to be an empty range, not an inverted one.
    const { min, max } = capLimits(draft, measured(safe.width * 20, safe.height * 20, 40));
    expect(max).toBe(min);
  });

  it('shrinks when the board does', () => {
    const size = measured(safe.width, 40, 50);
    const smaller = board({ widthMm: 200, heightMm: 110 });
    expect(capLimits(smaller, size).max).toBeLessThan(capLimits(draft, size).max);
  });

  it('shrinks when the shape gives its corners away', () => {
    // An oval loses more of its board than a rectangle does, so the same word
    // has to be set smaller on one than on the other.
    const size = measured(safe.width, 40, 50);
    const rect = capLimits(board({ shape: 'rect' }), size).max;
    const oval = capLimits(board({ shape: 'oval' }), size).max;
    const arch = capLimits(board({ shape: 'arch' }), size).max;
    expect(oval).toBeLessThan(rect);
    expect(arch).toBeLessThan(rect);
  });

  it('is a whole number of millimetres', () => {
    // It ends up on a drawing for the workshop, and it is rounded down rather
    // than to nearest so that the answer always fits.
    const { max } = capLimits(draft, measured(safe.width / 3, 40, 37));
    expect(Number.isInteger(max)).toBe(true);
    expect(max).toBe(Math.floor(37 * 3));
  });
});
