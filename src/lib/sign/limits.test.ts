import { describe, expect, it } from 'vitest';
import { CARVING_FONTS } from '@/config/carving-fonts';
import { capLimits, GROW_SLACK_MM, settledCapMm, settledPosition } from './limits';
import { defaultSign, makeBlock, safeArea, type Sign, type TextBlock } from './model';
import type { BlockBox } from './store';
import { MIN_CAP_MM } from './text';

const sign = (over: Partial<Sign> = {}): Sign => ({ ...defaultSign(), ...over });
const block = (over: Partial<TextBlock> = {}) => makeBlock({ text: 'Björkhaga', ...over });
const box = (widthMm: number, heightMm: number, capMm: number): BlockBox => ({
  widthMm,
  heightMm,
  capMm,
  offsetXMm: 0,
  offsetYMm: 0,
});

describe('the smallest letters offered', () => {
  it('comes from the narrowest stroke the face has', () => {
    // 0.8 mm is the finest cut on offer; a face whose thin strokes are a
    // twelfth of its cap height needs a ten-millimetre capital before the bit
    // can enter them at all.
    expect(capLimits(sign(), block({ fontId: 'cinzel' }), null).min).toBe(Math.ceil(0.8 / 0.085));
  });

  it('never goes below the floor, however fat the face', () => {
    expect(capLimits(sign(), block({ fontId: 'alfa-slab' }), null).min).toBe(MIN_CAP_MM);
  });

  it('is a real number for every face in the catalogue', () => {
    for (const font of CARVING_FONTS) {
      const { min } = capLimits(sign(), block({ fontId: font.id }), null);
      expect(Number.isInteger(min)).toBe(true);
      expect(min).toBeGreaterThanOrEqual(MIN_CAP_MM);
      expect(min).toBeLessThan(40);
    }
  });
});

describe('the largest letters that still fit', () => {
  const s = sign();
  const safe = safeArea(s);

  it('is generous before anything has been measured', () => {
    expect(capLimits(s, block(), null).max).toBeGreaterThan(100);
  });

  it('leaves a block that exactly fills the safe area where it is', () => {
    expect(capLimits(s, block(), box(safe.width, 40, 50)).max).toBe(50);
  });

  it('scales from the size the measurement was taken at', () => {
    expect(capLimits(s, block(), box(safe.width / 2, 40, 50)).max).toBe(100);
    expect(capLimits(s, block(), box(safe.width / 2, 40, 25)).max).toBe(50);
  });

  it('is decided by whichever way round the board runs out first', () => {
    expect(capLimits(s, block(), box(safe.width, safe.height / 4, 40)).max).toBe(40);
    expect(capLimits(s, block(), box(safe.width / 4, safe.height, 40)).max).toBe(40);
    expect(capLimits(s, block(), box(safe.width / 4, safe.height / 4, 40)).max).toBe(160);
  });

  it('shrinks when a border takes the room away', () => {
    const measured = box(safe.width, 40, 50);
    expect(capLimits(sign({ border: 'double' }), block(), measured).max).toBeLessThanOrEqual(
      capLimits(sign({ border: 'none' }), block(), measured).max,
    );
  });

  it('never drops below the smallest letters on offer', () => {
    const { min, max } = capLimits(s, block(), box(safe.width * 20, safe.height * 20, 40));
    expect(max).toBe(min);
  });
});

describe('settling on a size', () => {
  const s = sign();
  const safe = safeArea(s);

  it('shrinks lettering that no longer fits', () => {
    // Measured at 40 mm filling twice the safe width: half of 40 is the answer.
    const b = block({ capHeightMm: 40 });
    expect(settledCapMm(s, b, box(safe.width * 2, 40, 40), undefined)).toBe(20);
  });

  it('grows back to the size that was asked for', () => {
    /*
      The ratchet, and the reason this exists. Type a long name, the letters
      shrink; delete it and type a short one, and without this the sign keeps
      the small letters a word that is no longer there imposed on it.
    */
    const b = block({ capHeightMm: 12 });
    expect(settledCapMm(s, b, box(safe.width / 4, 20, 12), 38)).toBe(38);
  });

  it('never grows past what was asked for', () => {
    const b = block({ capHeightMm: 12 });
    expect(settledCapMm(s, b, box(safe.width / 10, 10, 12), 38)).toBe(38);
  });

  it('leaves a size the customer chose alone', () => {
    // Nothing was asked for beyond what is in force, so nothing moves.
    const b = block({ capHeightMm: 20 });
    expect(settledCapMm(s, b, box(safe.width / 4, 20, 20), 20)).toBe(20);
  });

  it('does not twitch over a single millimetre', () => {
    /*
      A block sitting a millimetre under its ceiling must stay put. Without the
      dead band it grows, measures fractionally larger at the new size, shrinks,
      and starts again — a flicker that never settles.
    */
    const b = block({ capHeightMm: 40 });
    const justUnder = box(safe.width * (40 / (40 + GROW_SLACK_MM - 1)), 40, 40);
    expect(settledCapMm(s, b, justUnder, 100)).toBe(40);
  });
});

describe('settling on a position', () => {
  const s = sign();
  const safe = safeArea(s);

  it('pulls a block back inside the safe area', () => {
    const b = block({ xMm: 0, yMm: 0, capHeightMm: 40 });
    const placed = settledPosition(s, b, box(100, 50, 40), 40);
    expect(placed.xMm).toBeCloseTo(safe.x + 50);
    expect(placed.yMm).toBeCloseTo(safe.y + 25);
  });

  it('leaves a block that is already inside where it is', () => {
    const b = block({ xMm: s.widthMm / 2, yMm: s.heightMm / 2, capHeightMm: 40 });
    const placed = settledPosition(s, b, box(100, 50, 40), 40);
    expect(placed).toEqual({ xMm: b.xMm, yMm: b.yMm });
  });

  it('centres a block too big for the room rather than jamming it in a corner', () => {
    const b = block({ xMm: 10, yMm: 10, capHeightMm: 40 });
    const placed = settledPosition(s, b, box(safe.width * 3, safe.height * 3, 40), 40);
    expect(placed.xMm).toBeCloseTo(safe.x + safe.width / 2);
    expect(placed.yMm).toBeCloseTo(safe.y + safe.height / 2);
  });

  it('measures the room at the size the block is about to become', () => {
    /*
      Position and size are corrected together, from one picture. Clamping at
      the old size and then shrinking would leave the block sitting where a
      larger version of it had to go.
    */
    const b = block({ xMm: 0, yMm: s.heightMm / 2, capHeightMm: 40 });
    const wide = box(safe.width, 40, 40);
    expect(settledPosition(s, b, wide, 40).xMm).toBeCloseTo(safe.x + safe.width / 2);
    expect(settledPosition(s, b, wide, 20).xMm).toBeCloseTo(safe.x + safe.width / 4);
  });
});
