import { describe, expect, it } from 'vitest';
import { SHOP } from '@/config/router-profile';
import { borderPathLengthMm } from './geometry';
import { defaultSign, makeBlock, type Sign, type TextBlock } from './model';
import { letteringPathLengthMm, priceSign } from './pricing';

const base = (over: Partial<Sign> = {}): Sign => ({ ...defaultSign(), ...over });
const saying = (text: string, over = {}) => [makeBlock({ text, ...over })];

describe('priceSign', () => {
  it('is deterministic for the same sign', () => {
    expect(priceSign(base())).toEqual(priceSign(base()));
  });

  it('returns whole öre, never fractions', () => {
    const p = priceSign(base());
    for (const value of [
      p.materialOre,
      p.carveOre,
      p.finishingOre,
      p.extrasOre,
      p.subtotalOre,
      p.vatOre,
      p.totalOre,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('rounds the customer total up to a whole 10 kr', () => {
    const p = priceSign(base());
    expect(p.totalOre % 1000).toBe(0);
    expect(p.totalOre).toBeGreaterThanOrEqual(p.subtotalOre + p.vatOre);
  });

  it('applies 25 % VAT to the subtotal', () => {
    const p = priceSign(base());
    expect(p.vatOre).toBe(Math.round(p.subtotalOre * 0.25));
  });

  it('charges more for a larger board, all else equal', () => {
    const small = priceSign(base({ widthMm: 300, heightMm: 150 }));
    const large = priceSign(base({ widthMm: 800, heightMm: 400 }));
    expect(large.totalOre).toBeGreaterThan(small.totalOre);
  });

  it('charges more for a more expensive timber, all else equal', () => {
    const pine = priceSign(base({ woodId: 'furu' }));
    const walnut = priceSign(base({ woodId: 'valnot' }));
    expect(walnut.materialOre).toBeGreaterThan(pine.materialOre);
    expect(walnut.totalOre).toBeGreaterThan(pine.totalOre);
  });

  it('charges more for thicker stock', () => {
    expect(priceSign(base({ thicknessMm: 40 })).materialOre).toBeGreaterThan(
      priceSign(base({ thicknessMm: 20 })).materialOre,
    );
  });

  it('charges more for more lettering', () => {
    const short = priceSign(base({ blocks: saying('Ek') }));
    const long = priceSign(base({ blocks: saying('Kungsholmens Snickeri och Skyltverkstad') }));
    expect(long.carveOre).toBeGreaterThan(short.carveOre);
  });

  it('charges for a border, and more for a double one', () => {
    const none = priceSign(base({ border: 'none' }));
    const line = priceSign(base({ border: 'line' }));
    const double = priceSign(base({ border: 'double' }));
    expect(line.carveOre).toBeGreaterThan(none.carveOre);
    expect(double.carveOre).toBeGreaterThan(line.carveOre);
  });

  it('charges for the hanging hardware', () => {
    const bare = priceSign(base({ hanging: 'none' }));
    const keyhole = priceSign(base({ hanging: 'keyhole' }));
    const posts = priceSign(base({ hanging: 'posts' }));
    expect(keyhole.extrasOre).toBeGreaterThan(bare.extrasOre);
    expect(posts.extrasOre).toBeGreaterThan(keyhole.extrasOre);
  });

  it('never falls below the minimum order value', () => {
    const tiny = priceSign(
      base({
        widthMm: 100,
        heightMm: 60,
        woodId: 'furu',
        finish: 'raw',
        hanging: 'none',
        border: 'none',
        blocks: saying('A', { capHeightMm: 20 }),
      }),
    );
    expect(tiny.subtotalOre).toBeGreaterThanOrEqual(SHOP.minimumOrderOre);
    expect(tiny.minimumApplied).toBe(true);
  });

  it('does not apply the minimum to an ordinary sign', () => {
    expect(priceSign(base()).minimumApplied).toBe(false);
  });

  it('prices raised lettering from board area rather than text length', () => {
    const raised = base({ method: 'raised' });
    const oneWord = priceSign({ ...raised, blocks: saying('Ek') });
    const manyWords = priceSign({ ...raised, blocks: saying('Ek och ask och björk') });
    // Clearing the background dominates, so the two must stay close together.
    const delta = Math.abs(manyWords.carveOre - oneWord.carveOre) / oneWord.carveOre;
    expect(delta).toBeLessThan(0.35);
  });

  it('prices each block at its own size and face', () => {
    /*
      The reason the rebuild happened. A name over a year is two blocks with two
      cap heights, and charging both at one size was wrong whichever way it
      rounded — this asks each block what it costs and adds them up.
    */
    const name = makeBlock({ text: 'BJÖRKHAGA', capHeightMm: 50 });
    const year = makeBlock({ text: '1953', capHeightMm: 18 });

    // Against a bare board, because cutting the blank free of the stock is a
    // cost of the sign and not of anything written on it — adding the two
    // one-block signs together would charge for that twice.
    const bare = priceSign(base({ blocks: [] })).carveOre;
    const lettering = (blocks: TextBlock[]) => priceSign(base({ blocks })).carveOre - bare;

    expect(lettering([name, year])).toBeCloseTo(lettering([name]) + lettering([year]), 5);

    // And the small block really is the cheaper of the two.
    expect(lettering([year])).toBeLessThan(lettering([name]));
  });

  it('produces a plausible price for a typical 400 × 220 oak sign', () => {
    // A guard against the model drifting somewhere absurd after a tweak.
    const p = priceSign(base());
    expect(p.totalOre).toBeGreaterThan(60_000);
    expect(p.totalOre).toBeLessThan(400_000);
  });
});

describe('letteringPathLengthMm', () => {
  it('ignores whitespace', () => {
    expect(letteringPathLengthMm(base({ blocks: saying('a b c') }))).toBeCloseTo(
      letteringPathLengthMm(base({ blocks: saying('abc') })),
    );
  });

  it('scales with cap height', () => {
    const small = letteringPathLengthMm(base({ blocks: saying('abc', { capHeightMm: 20 }) }));
    const large = letteringPathLengthMm(base({ blocks: saying('abc', { capHeightMm: 40 }) }));
    expect(large).toBeCloseTo(small * 2);
  });

  it('adds its blocks up', () => {
    const one = letteringPathLengthMm(base({ blocks: saying('abc') }));
    const two = letteringPathLengthMm(
      base({ blocks: [makeBlock({ text: 'abc' }), makeBlock({ text: 'abc' })] }),
    );
    expect(two).toBeCloseTo(one * 2);
  });

  it('is zero for a board with nothing on it', () => {
    expect(letteringPathLengthMm(base({ blocks: [] }))).toBe(0);
    expect(letteringPathLengthMm(base({ blocks: saying('   ') }))).toBe(0);
  });
});

describe('borderPathLengthMm', () => {
  it('is zero when there is no border', () => {
    expect(borderPathLengthMm(base({ border: 'none' }))).toBe(0);
  });

  it('makes a double border longer than a single one', () => {
    expect(borderPathLengthMm(base({ border: 'double' }))).toBeGreaterThan(
      borderPathLengthMm(base({ border: 'line' })),
    );
  });

  it('follows the board, so a bigger board has a longer border', () => {
    expect(
      borderPathLengthMm(base({ border: 'line', widthMm: 800, heightMm: 400 })),
    ).toBeGreaterThan(borderPathLengthMm(base({ border: 'line', widthMm: 300, heightMm: 150 })));
  });
});
