import { describe, expect, it } from 'vitest';
import { validateDesign, hasBlockingWarning } from './validation';
import { defaultDesign, makeTextBlock } from './defaults';
import { MACHINE } from '@/config/router-profile';

describe('validateDesign', () => {
  it('passes a sensible default design', () => {
    const warnings = validateDesign(defaultDesign());
    expect(hasBlockingWarning(warnings)).toBe(false);
  });

  it('blocks a sign larger than the machine', () => {
    const warnings = validateDesign({
      ...defaultDesign(),
      widthMm: MACHINE.workAreaMm.width + 100,
    });
    expect(warnings.some((w) => w.id === 'size-too-large' && w.severity === 'blocking')).toBe(true);
  });

  it('blocks a sign below the minimum size', () => {
    const warnings = validateDesign({ ...defaultDesign(), widthMm: 20, heightMm: 20 });
    expect(warnings.some((w) => w.id === 'size-too-small')).toBe(true);
  });

  it('blocks an empty design with no artwork', () => {
    const warnings = validateDesign({ ...defaultDesign(), texts: [], artwork: null });
    expect(hasBlockingWarning(warnings)).toBe(true);
  });

  it('blocks hairline strokes when they must be pocketed', () => {
    // Playfair at 20 mm gives ~0,9 mm strokes — far below the 3,175 mm bit.
    const warnings = validateDesign({
      ...defaultDesign(),
      method: 'pocket',
      texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej', capHeightMm: 20 })],
    });
    const stroke = warnings.find((w) => w.id.startsWith('stroke-too-thin'));
    expect(stroke?.severity).toBe('blocking');
  });

  it('only warns about too-thin strokes when V-carving, since a V-bit has a point', () => {
    // 15 mm of Playfair is ~0,68 mm of stroke: under the V-bit's 0,8 mm, so it
    // warns — but a V-bit tapers to a point, so it is never a hard stop.
    const warnings = validateDesign({
      ...defaultDesign(),
      method: 'vcarve',
      texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej', capHeightMm: 15 })],
    });
    const stroke = warnings.find((w) => w.id.startsWith('stroke-too-thin'));
    expect(stroke?.severity).toBe('warning');
    expect(hasBlockingWarning(warnings)).toBe(false);
  });

  it('accepts strokes a V-bit can just enter', () => {
    // Playfair at 20 mm is ~0,9 mm, just over the 60° V-bit's 0,8 mm minimum.
    const warnings = validateDesign({
      ...defaultDesign(),
      method: 'vcarve',
      texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej', capHeightMm: 20 })],
    });
    expect(warnings.some((w) => w.id.startsWith('stroke-too-thin'))).toBe(false);
  });

  it('warns when a face is used below its minimum cap height', () => {
    const warnings = validateDesign({
      ...defaultDesign(),
      texts: [makeTextBlock({ fontId: 'cinzel', content: 'Hej', capHeightMm: 14 })],
    });
    expect(warnings.some((w) => w.id.startsWith('below-min-cap'))).toBe(true);
  });

  it('warns about an indoor timber destined for outdoors', () => {
    const warnings = validateDesign({
      ...defaultDesign(),
      woodId: 'valnot',
      placement: 'outdoor',
    });
    expect(warnings.some((w) => w.id === 'wood-not-outdoor')).toBe(true);
  });

  it('does not warn about oak outdoors', () => {
    const warnings = validateDesign({ ...defaultDesign(), woodId: 'ek', placement: 'outdoor' });
    expect(warnings.some((w) => w.id === 'wood-not-outdoor')).toBe(false);
  });

  it('reports measured overflow from the preview', () => {
    const warnings = validateDesign(defaultDesign(), { overflows: true });
    expect(warnings.some((w) => w.id === 'overflow')).toBe(true);
  });

  it('gives every warning a message in both languages', () => {
    const warnings = validateDesign({
      ...defaultDesign(),
      widthMm: 5000,
      placement: 'outdoor',
      woodId: 'valnot',
      method: 'pocket',
      texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej', capHeightMm: 10 })],
    });
    expect(warnings.length).toBeGreaterThan(2);
    for (const w of warnings) {
      expect(w.message.sv.length).toBeGreaterThan(0);
      expect(w.message.en.length).toBeGreaterThan(0);
      expect(w.message.sv).not.toBe(w.message.en);
    }
  });
});
