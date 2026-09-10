import { describe, expect, it } from 'vitest';
import { CARVING_FONTS, getFont, DEFAULT_FONT_ID } from './carving-fonts';
import { WOODS, getWood, DEFAULT_WOOD } from './woods';
import { BITS, MACHINE, SHOP } from './router-profile';

/**
 * These guard the catalogues against the kind of edit that breaks the site
 * quietly: a duplicated id, a font whose CSS variable no longer matches the
 * loader, a wood with a missing translation.
 */

describe('carving fonts', () => {
  it('has unique ids', () => {
    const ids = CARVING_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every cssFamily at its own declared variable', () => {
    for (const font of CARVING_FONTS) {
      expect(font.cssFamily).toContain(`var(${font.variable})`);
    }
  });

  it('declares a distinct CSS variable per face', () => {
    const vars = CARVING_FONTS.map((f) => f.variable);
    expect(new Set(vars).size).toBe(vars.length);
  });

  it('gives every face notes in both languages', () => {
    for (const font of CARVING_FONTS) {
      expect(font.note.sv.length).toBeGreaterThan(20);
      expect(font.note.en.length).toBeGreaterThan(20);
    }
  });

  it('keeps stroke ratios and path factors in a physically sensible range', () => {
    for (const font of CARVING_FONTS) {
      expect(font.strokeRatio).toBeGreaterThan(0);
      expect(font.strokeRatio).toBeLessThan(0.5);
      expect(font.pathFactor).toBeGreaterThan(1);
      expect(font.pathFactor).toBeLessThan(10);
      expect(font.minCapHeightMm).toBeGreaterThan(0);
      // A cap height is always a fraction of the em, and never a tiny one.
      expect(font.capRatio).toBeGreaterThan(0.4);
      expect(font.capRatio).toBeLessThan(0.9);
    }
  });

  it('marks the hairline faces as needing a larger minimum than the sturdy ones', () => {
    expect(getFont('playfair').minCapHeightMm).toBeGreaterThan(getFont('bebas').minCapHeightMm);
  });

  it('resolves the default id and falls back for an unknown one', () => {
    expect(getFont(DEFAULT_FONT_ID).id).toBe(DEFAULT_FONT_ID);
    expect(getFont('no-such-font')).toBe(CARVING_FONTS[0]);
  });
});

describe('woods', () => {
  it('has unique ids', () => {
    const ids = WOODS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every species a name, note and hardness in both languages', () => {
    for (const wood of WOODS) {
      expect(wood.name.sv.length).toBeGreaterThan(0);
      expect(wood.name.en.length).toBeGreaterThan(0);
      expect(wood.note.sv.length).toBeGreaterThan(20);
      expect(wood.note.en.length).toBeGreaterThan(20);
      expect(wood.hardness.sv.length).toBeGreaterThan(0);
      expect(wood.hardness.en.length).toBeGreaterThan(0);
    }
  });

  it('gives every species three valid hex colours', () => {
    for (const wood of WOODS) {
      for (const value of Object.values(wood.colour)) {
        expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('prices and machining factors are positive', () => {
    for (const wood of WOODS) {
      expect(wood.pricePerDm2).toBeGreaterThan(0);
      expect(wood.machiningFactor).toBeGreaterThan(0);
      expect(wood.grainStrength).toBeGreaterThanOrEqual(0);
      expect(wood.grainStrength).toBeLessThanOrEqual(1);
    }
  });

  it('offers at least one timber fit for an outdoor sign', () => {
    expect(WOODS.some((w) => w.outdoorSuitable)).toBe(true);
  });

  it('resolves the default id and falls back for an unknown one', () => {
    expect(getWood(DEFAULT_WOOD).id).toBe(DEFAULT_WOOD);
    expect(getWood('driftwood')).toBe(WOODS[0]);
  });
});

describe('router profile', () => {
  it('gives a V-bit a narrower minimum stroke than any straight cutter', () => {
    const v = BITS.filter((b) => b.use === 'vcarve');
    const straight = BITS.filter((b) => b.use !== 'vcarve');
    const widestV = Math.max(...v.map((b) => b.minStrokeMm));
    const narrowestStraight = Math.min(...straight.map((b) => b.minStrokeMm));
    expect(widestV).toBeLessThan(narrowestStraight);
  });

  it('cannot cut a slot narrower than a straight cutter is wide', () => {
    for (const bit of BITS.filter((b) => b.angleDeg === null)) {
      expect(bit.minStrokeMm).toBeGreaterThanOrEqual(bit.diameterMm);
    }
  });

  it('has a work area larger than the minimum sign', () => {
    expect(MACHINE.workAreaMm.width).toBeGreaterThan(MACHINE.minSignMm.width);
    expect(MACHINE.workAreaMm.height).toBeGreaterThan(MACHINE.minSignMm.height);
  });

  it('keeps shop money as whole öre', () => {
    expect(Number.isInteger(SHOP.hourlyRateOre)).toBe(true);
    expect(Number.isInteger(SHOP.setupFeeOre)).toBe(true);
    expect(Number.isInteger(SHOP.minimumOrderOre)).toBe(true);
  });
});
