import { describe, expect, it } from 'vitest';
import {
  availableFinishes,
  availableFonts,
  availableMethods,
  availableWoods,
  capHeightRange,
  isOrderable,
  limitLines,
  MAX_TEXT_LINES,
  reconcile,
} from './constraints';
import { defaultDesign, makeTextBlock, PRESETS } from './defaults';
import { getFont } from '@/config/carving-fonts';
import { BITS, MACHINE } from '@/config/router-profile';
import { WOODS } from '@/config/woods';

const base = () => defaultDesign();

describe('the always-available catalogues', () => {
  it('offers every timber', () => {
    expect(availableWoods().length).toBe(WOODS.length);
  });

  it('offers all three cuts and all four finishes', () => {
    expect(availableMethods()).toHaveLength(3);
    expect(availableFinishes()).toHaveLength(4);
  });

  it('offers at least one timber that survives outdoors', () => {
    // Not a constraint any more, but the catalogue still has to be able to
    // answer someone who wants a sign for a gatepost.
    expect(availableWoods().some((w) => w.outdoorSuitable)).toBe(true);
  });
});

describe('availableFonts', () => {
  it('excludes faces that would disappoint under the chosen method', () => {
    for (const method of ['vcarve', 'pocket', 'raised'] as const) {
      for (const font of availableFonts(method)) {
        expect(font.suitability[method]).not.toBe('caution');
      }
    }
  });

  it('never returns an empty picker', () => {
    for (const method of ['vcarve', 'pocket', 'raised'] as const) {
      expect(availableFonts(method).length).toBeGreaterThan(0);
    }
  });

  it('offers more faces for V-carving than for pocketing', () => {
    // A V-bit comes to a point, so it copes with faces a straight cutter cannot.
    expect(availableFonts('vcarve').length).toBeGreaterThanOrEqual(availableFonts('pocket').length);
  });
});

describe('capHeightRange', () => {
  it('never lets a stroke fall below what the bit can enter', () => {
    for (const method of ['vcarve', 'pocket'] as const) {
      const bit =
        method === 'vcarve' ? BITS.find((b) => b.id === 'v60')! : BITS.find((b) => b.id === 'em3')!;
      for (const font of availableFonts(method)) {
        const block = makeTextBlock({ fontId: font.id, content: 'Hej' });
        const { min } = capHeightRange({ ...base(), method }, block);
        const strokeAtMin = min * font.strokeRatio;
        expect(strokeAtMin).toBeGreaterThanOrEqual(bit.minStrokeMm - 0.001);
      }
    }
  });

  it('honours the face own minimum too', () => {
    const font = getFont('cinzel');
    const block = makeTextBlock({ fontId: 'cinzel', content: 'Hej' });
    expect(capHeightRange(base(), block).min).toBeGreaterThanOrEqual(font.minCapHeightMm);
  });

  it('keeps max at or above min for every face and method', () => {
    for (const method of ['vcarve', 'pocket', 'raised'] as const) {
      for (const font of availableFonts(method)) {
        const block = makeTextBlock({ fontId: font.id, content: 'Hej' });
        const { min, max } = capHeightRange({ ...base(), method }, block);
        expect(max).toBeGreaterThanOrEqual(min);
      }
    }
  });

  it('shrinks the ceiling as lines are added', () => {
    const one = capHeightRange(base(), makeTextBlock({ content: 'Ett' }));
    const three = capHeightRange(base(), makeTextBlock({ content: 'Ett\nTva\nTre' }));
    expect(three.max).toBeLessThan(one.max);
  });

  it('shrinks the ceiling on a shorter board', () => {
    const tall = capHeightRange({ ...base(), heightMm: 400 }, makeTextBlock({ content: 'A' }));
    const short = capHeightRange({ ...base(), heightMm: 120 }, makeTextBlock({ content: 'A' }));
    expect(short.max).toBeLessThan(tall.max);
  });

  it('uses a measured width to cap the size when one is supplied', () => {
    const block = makeTextBlock({ content: 'Ett mycket långt husnamn' });
    const unmeasured = capHeightRange(base(), block);
    // 400 mm wide at a 100 mm cap: the text is four times too wide to fit.
    const measured = capHeightRange(base(), block, 400);
    expect(measured.max).toBeLessThan(unmeasured.max);
  });
});

describe('reconcile', () => {
  it('leaves a valid design untouched', () => {
    const design = base();
    expect(reconcile(design)).toBe(design);
  });

  it('leaves every shipped preset untouched', () => {
    // A preset that needed correcting would visibly rearrange itself the
    // instant it was picked, which looks like a bug to the person picking it.
    for (const preset of PRESETS) {
      const design = structuredClone(preset.design);
      expect({ id: preset.id, design: reconcile(design) }).toEqual({ id: preset.id, design });
    }
  });

  it('replaces a face that does not suit a newly chosen method', () => {
    const withPlayfair = { ...base(), texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej' })] };
    const next = reconcile({ ...withPlayfair, method: 'pocket' });
    expect(availableFonts('pocket').some((f) => f.id === next.texts[0].fontId)).toBe(true);
  });

  it('pulls an oversized sign back inside the machine', () => {
    const next = reconcile({ ...base(), widthMm: 5000, heightMm: 4000 });
    expect(next.widthMm).toBe(MACHINE.workAreaMm.width);
    expect(next.heightMm).toBe(MACHINE.workAreaMm.height);
  });

  it('pushes an undersized sign up to the minimum', () => {
    const next = reconcile({ ...base(), widthMm: 10, heightMm: 10 });
    expect(next.widthMm).toBe(MACHINE.minSignMm.width);
    expect(next.heightMm).toBe(MACHINE.minSignMm.height);
  });

  it('raises text that is too small for the bit', () => {
    const next = reconcile({
      ...base(),
      texts: [makeTextBlock({ fontId: 'cinzel', content: 'Hej', capHeightMm: 2 })],
    });
    const { min } = capHeightRange(next, next.texts[0]);
    expect(next.texts[0].capHeightMm).toBeGreaterThanOrEqual(min);
  });

  it('lowers text that is too tall for the board', () => {
    const next = reconcile({
      ...base(),
      heightMm: 120,
      texts: [makeTextBlock({ content: 'Hej', capHeightMm: 200 })],
    });
    expect(next.texts[0].capHeightMm).toBeLessThan(200);
  });

  it('pulls a border inset back inside a shrinking board', () => {
    const next = reconcile({
      ...base(),
      widthMm: 120,
      heightMm: 100,
      decoration: { border: 'line', insetMm: 90, corners: 'none' },
    });
    expect(next.decoration.insetMm).toBeLessThan(50);
  });

  it('keeps every timber available whatever else is chosen', () => {
    // Timber is no longer constrained by anything, so walnut must survive a
    // change that would once have swapped it out.
    expect(reconcile({ ...base(), woodId: 'valnot', method: 'raised' }).woodId).toBe('valnot');
  });

  it('is idempotent — reconciling twice changes nothing more', () => {
    const once = reconcile({ ...base(), woodId: 'valnot', method: 'pocket', widthMm: 9000 });
    expect(reconcile(once)).toBe(once);
  });

  it('always produces a design whose every choice is on offer', () => {
    // A deliberately incoherent starting point.
    const next = reconcile({
      ...base(),
      woodId: 'valnot',
      method: 'raised',
      widthMm: 4000,
      texts: [makeTextBlock({ fontId: 'playfair', content: 'Hej', capHeightMm: 1 })],
    });
    expect(availableWoods().some((w) => w.id === next.woodId)).toBe(true);
    expect(availableMethods()).toContain(next.method);
    expect(availableFinishes()).toContain(next.finish);
    expect(availableFonts(next.method).some((f) => f.id === next.texts[0].fontId)).toBe(true);
    expect(next.widthMm).toBeLessThanOrEqual(MACHINE.workAreaMm.width);
  });
});

describe('circle text', () => {
  it('pulls a ring back inside a board it would overhang', () => {
    const next = reconcile({
      ...base(),
      widthMm: 200,
      heightMm: 200,
      texts: [makeTextBlock({ content: 'Runt', wrap: 'circle', circleRadiusMm: 400 })],
    });
    expect(next.texts[0].circleRadiusMm).toBeLessThan(100);
  });

  it('leaves a ring that already fits alone', () => {
    const design = {
      ...base(),
      widthMm: 300,
      heightMm: 300,
      shape: 'oval' as const,
      decoration: { border: 'none' as const, insetMm: 10, corners: 'none' as const },
      texts: [makeTextBlock({ content: 'Runt', wrap: 'circle', circleRadiusMm: 60 })],
    };
    expect(reconcile(design).texts[0].circleRadiusMm).toBe(60);
  });

  it('tightens the ring when a deep border is added', () => {
    const plain = reconcile({
      ...base(),
      widthMm: 300,
      heightMm: 300,
      decoration: { border: 'none', insetMm: 10, corners: 'none' },
      texts: [makeTextBlock({ content: 'Runt', wrap: 'circle', circleRadiusMm: 400 })],
    });
    const framed = reconcile({
      ...plain,
      decoration: { border: 'double', insetMm: 50, corners: 'none' },
    });
    expect(framed.texts[0].circleRadiusMm).toBeLessThan(plain.texts[0].circleRadiusMm);
  });
});

describe('the line limit', () => {
  it('keeps a block within three lines', () => {
    const next = reconcile({
      ...base(),
      texts: [makeTextBlock({ content: 'Ett\nTva\nTre\nFyra\nFem' })],
    });
    expect(next.texts[0].content.split('\n')).toHaveLength(MAX_TEXT_LINES);
    expect(next.texts[0].content).toBe('Ett\nTva\nTre');
  });

  it('leaves a block that is already short enough alone', () => {
    const design = { ...base(), texts: [makeTextBlock({ content: 'Ett\nTva' })] };
    expect(reconcile(design).texts[0].content).toBe('Ett\nTva');
  });

  it('trims from the end, keeping what was typed first', () => {
    expect(limitLines('a\nb\nc\nd')).toBe('a\nb\nc');
  });
});

describe('the decorative border', () => {
  it('pulls the size ceiling in when a border is added', () => {
    const plain = { ...base(), decoration: { border: 'none' as const, insetMm: 12, corners: 'none' as const } };
    const framed = { ...base(), decoration: { border: 'double' as const, insetMm: 26, corners: 'diamond' as const } };
    const block = makeTextBlock({ content: 'Hej' });
    expect(capHeightRange(framed, block).max).toBeLessThan(capHeightRange(plain, block).max);
  });

  it('shrinks text that a newly deepened border would cross', () => {
    const design = reconcile({
      ...base(),
      heightMm: 200,
      texts: [makeTextBlock({ content: 'Hej', capHeightMm: 120 })],
    });
    const framed = reconcile({
      ...design,
      decoration: { border: 'double', insetMm: 40, corners: 'none' },
    });
    expect(framed.texts[0].capHeightMm).toBeLessThan(design.texts[0].capHeightMm);
  });
});

describe('isOrderable', () => {
  it('is false with nothing written and no artwork', () => {
    expect(isOrderable({ ...base(), texts: [], artwork: null })).toBe(false);
  });

  it('is false when the only line is blank space', () => {
    expect(
      isOrderable({ ...base(), texts: [makeTextBlock({ content: '   ' })], artwork: null }),
    ).toBe(false);
  });

  it('is true with wording', () => {
    expect(isOrderable(base())).toBe(true);
  });

  it('is true with artwork but no wording', () => {
    expect(
      isOrderable({
        ...base(),
        texts: [],
        artwork: {
          svg: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>',
          fileName: 'logo.svg',
          aspect: 1,
          widthMm: 60,
          x: 0.5,
          y: 0.3,
          rotation: 0,
        },
      }),
    ).toBe(true);
  });
});
