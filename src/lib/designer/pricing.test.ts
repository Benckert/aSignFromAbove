import { describe, expect, it } from 'vitest';
import { priceSign, letteringPathLengthMm, decorationPathLengthMm } from './pricing';
import { defaultDesign, makeTextBlock } from './defaults';
import { SHOP } from '@/config/router-profile';
import type { SignDesign } from './types';

const base = (): SignDesign => defaultDesign();

describe('priceSign', () => {
  it('is deterministic for the same design', () => {
    const a = priceSign(base());
    const b = priceSign(base());
    expect(a).toEqual(b);
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
    const small = priceSign({ ...base(), widthMm: 300, heightMm: 150 });
    const large = priceSign({ ...base(), widthMm: 800, heightMm: 400 });
    expect(large.totalOre).toBeGreaterThan(small.totalOre);
  });

  it('charges more for a more expensive timber, all else equal', () => {
    const pine = priceSign({ ...base(), woodId: 'furu' });
    const walnut = priceSign({ ...base(), woodId: 'valnot' });
    expect(walnut.materialOre).toBeGreaterThan(pine.materialOre);
    expect(walnut.totalOre).toBeGreaterThan(pine.totalOre);
  });

  it('charges more for thicker stock', () => {
    const thin = priceSign({ ...base(), thicknessMm: 20 });
    const thick = priceSign({ ...base(), thicknessMm: 40 });
    expect(thick.materialOre).toBeGreaterThan(thin.materialOre);
  });

  it('charges more for more lettering', () => {
    const short = priceSign({
      ...base(),
      texts: [makeTextBlock({ content: 'Ek' })],
    });
    const long = priceSign({
      ...base(),
      texts: [makeTextBlock({ content: 'Kungsholmens Snickeri och Skyltverkstad' })],
    });
    expect(long.carveOre).toBeGreaterThan(short.carveOre);
  });

  it('never falls below the minimum order value', () => {
    const tiny = priceSign({
      ...base(),
      widthMm: 100,
      heightMm: 60,
      woodId: 'furu',
      finish: 'raw',
      hanging: 'none',
      decoration: { border: 'none', insetMm: 10, corners: 'none' },
      texts: [makeTextBlock({ content: 'A', capHeightMm: 20 })],
    });
    expect(tiny.subtotalOre).toBeGreaterThanOrEqual(SHOP.minimumOrderOre);
    expect(tiny.minimumApplied).toBe(true);
  });

  it('does not apply the minimum to an ordinary sign', () => {
    expect(priceSign(base()).minimumApplied).toBe(false);
  });

  it('prices raised lettering from board area rather than text length', () => {
    const design = { ...base(), method: 'raised' as const };
    const oneWord = priceSign({ ...design, texts: [makeTextBlock({ content: 'Ek' })] });
    const manyWords = priceSign({
      ...design,
      texts: [makeTextBlock({ content: 'Ek och ask och björk' })],
    });
    // Clearing the background dominates, so the two must be close together.
    const delta = Math.abs(manyWords.carveOre - oneWord.carveOre) / oneWord.carveOre;
    expect(delta).toBeLessThan(0.35);
  });

  it('charges for supplied artwork', () => {
    const without = priceSign(base());
    const design = base();
    const withArt = priceSign({
      ...design,
      artwork: {
        svg: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>',
        fileName: 'logo.svg',
        aspect: 1,
        widthMm: 60,
        x: 0.5,
        y: 0.25,
        rotation: 0,
      },
    });
    expect(withArt.totalOre).toBeGreaterThan(without.totalOre);
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
    const withSpaces = letteringPathLengthMm({
      ...base(),
      texts: [makeTextBlock({ content: 'a b c' })],
    });
    const withoutSpaces = letteringPathLengthMm({
      ...base(),
      texts: [makeTextBlock({ content: 'abc' })],
    });
    expect(withSpaces).toBeCloseTo(withoutSpaces);
  });

  it('scales with cap height', () => {
    const small = letteringPathLengthMm({
      ...base(),
      texts: [makeTextBlock({ content: 'abc', capHeightMm: 20 })],
    });
    const large = letteringPathLengthMm({
      ...base(),
      texts: [makeTextBlock({ content: 'abc', capHeightMm: 40 })],
    });
    expect(large).toBeCloseTo(small * 2);
  });

  it('is zero for an empty design', () => {
    expect(letteringPathLengthMm({ ...base(), texts: [] })).toBe(0);
  });
});

describe('decorationPathLengthMm', () => {
  it('is zero when nothing is decorated', () => {
    const design = { ...base(), decoration: { border: 'none' as const, insetMm: 10, corners: 'none' as const } };
    expect(decorationPathLengthMm(design)).toBe(0);
  });

  it('makes a double border longer than a single one', () => {
    const single = decorationPathLengthMm({
      ...base(),
      decoration: { border: 'line', insetMm: 12, corners: 'none' },
    });
    const double = decorationPathLengthMm({
      ...base(),
      decoration: { border: 'double', insetMm: 12, corners: 'none' },
    });
    expect(double).toBeGreaterThan(single);
  });
});
