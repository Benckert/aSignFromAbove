import { describe, expect, it } from 'vitest';
import { shade, luminance, isDark } from './colour';
import { WOODS } from '@/config/woods';

describe('shade', () => {
  it('darkens towards black and lightens towards white', () => {
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#808080', 1)).toBe('#ffffff');
  });

  it('leaves a colour alone at zero', () => {
    expect(shade('#a76a2b', 0)).toBe('#a76a2b');
  });

  it('accepts three-digit hex', () => {
    expect(shade('#fff', 0)).toBe('#ffffff');
  });

  it('never leaves the byte range', () => {
    for (const amount of [-2, -1, 0, 1, 2]) {
      expect(shade('#123456', amount)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('luminance', () => {
  it('ranks black below white', () => {
    expect(luminance('#000000')).toBeLessThan(luminance('#ffffff'));
  });

  it('puts white at 1 and black at 0', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 3);
    expect(luminance('#000000')).toBeCloseTo(0, 3);
  });
});

describe('isDark', () => {
  it('classifies walnut as dark and birch as light', () => {
    const walnut = WOODS.find((w) => w.id === 'valnot')!;
    const birch = WOODS.find((w) => w.id === 'bjork')!;
    expect(isDark(walnut.colour.base)).toBe(true);
    expect(isDark(birch.colour.base)).toBe(false);
  });
});
