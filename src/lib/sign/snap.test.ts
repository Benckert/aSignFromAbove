import { describe, expect, it } from 'vitest';
import { blockGuides, boardGuides, snapAxis, snapBox, type Guide } from './snap';

const BOARD = { x: 0, y: 0, width: 400, height: 220 };
const SAFE = { x: 28, y: 15, width: 344, height: 190 };

const guides = boardGuides(BOARD, SAFE);
const at = (axis: 'x' | 'y', value: number): Guide =>
  guides.find((g) => g.axis === axis && Math.abs(g.at - value) < 0.01)!;

describe('snapAxis', () => {
  it('finds nothing when everything is far away', () => {
    const result = snapAxis({ min: 0, max: 10 }, [at('x', 200)], 5);
    expect(result).toEqual({ delta: 0, guide: null });
  });

  it('pulls a centre onto a guide', () => {
    // A 100 mm block whose centre sits at 197: three short of the board's.
    const result = snapAxis({ min: 147, max: 247 }, [at('x', 200)], 5);
    expect(result.delta).toBeCloseTo(3);
    expect(result.guide?.kind).toBe('centre');
  });

  it('pulls an edge onto a guide', () => {
    const result = snapAxis({ min: 26, max: 126 }, [at('x', 28)], 5);
    expect(result.delta).toBeCloseTo(2);
    expect(result.guide?.kind).toBe('safe');
  });

  it('takes the nearer of two', () => {
    const result = snapAxis({ min: 195, max: 295 }, guides.filter((g) => g.axis === 'x'), 12);
    // The left edge is 5 mm from the centre line; the block's own centre is 45
    // away from it and its right edge 77 from the right of the safe area.
    expect(result.delta).toBeCloseTo(5);
  });

  it('prefers the board centre when two are equally close', () => {
    const centre = at('x', 200);
    const rival: Guide = { axis: 'x', at: 210, kind: 'block', from: 0, to: 220 };
    // A block from 190 to 220: its centre (205) is 5 from both.
    const result = snapAxis({ min: 190, max: 220 }, [rival, centre], 8);
    expect(result.guide?.kind).toBe('centre');
  });
});

describe('snapBox', () => {
  const box = { x: 147, y: 60, width: 100, height: 40 };

  it('centres a block that is nearly centred', () => {
    const result = snapBox({ ...box, x: 148, y: 88 }, guides, 5);
    expect(result.x + 50).toBeCloseTo(200);
    expect(result.y + 20).toBeCloseTo(110);
    expect(result.guides).toHaveLength(2);
  });

  it('treats the two axes separately', () => {
    // Centred across, but hard against the top of the safe area.
    const result = snapBox({ ...box, x: 149, y: 16 }, guides, 5);
    expect(result.x + 50).toBeCloseTo(200);
    expect(result.y).toBeCloseTo(15);
    expect(result.guides.map((g) => g.kind).sort()).toEqual(['centre', 'safe']);
  });

  it('rounds to whole millimetres when nothing is near', () => {
    const result = snapBox({ ...box, x: 60.4, y: 41.8 }, guides, 5);
    expect(result.x).toBe(60);
    expect(result.y).toBe(42);
    expect(result.guides).toEqual([]);
  });

  it('leaves the position alone when snapping is bypassed', () => {
    // What the Alt key buys: a position between the millimetres.
    const result = snapBox({ ...box, x: 149.37, y: 88.21 }, guides, 5, true);
    expect(result.x).toBe(149.37);
    expect(result.y).toBe(88.21);
    expect(result.guides).toEqual([]);
  });
});

describe('another block as a guide', () => {
  it('lines two blocks up on their shared centre', () => {
    const first = { x: 100, y: 40, width: 200, height: 40 };
    const all = [...guides, ...blockGuides(first)];
    // A second block, 3 mm off the first's centre.
    const result = snapBox({ x: 150, y: 120, width: 100, height: 30 }, all, 5);
    expect(result.x + 50).toBeCloseTo(200);
  });

  it('lines two blocks up on a shared left edge', () => {
    const first = { x: 60, y: 40, width: 200, height: 40 };
    const all = blockGuides(first);
    const result = snapBox({ x: 62, y: 120, width: 100, height: 30 }, all, 5);
    expect(result.x).toBeCloseTo(60);
    expect(result.guides[0].kind).toBe('block');
  });
});

describe('boardGuides', () => {
  it('offers both centre lines and all four edges of the safe area', () => {
    expect(guides.filter((g) => g.kind === 'centre')).toHaveLength(2);
    expect(guides.filter((g) => g.kind === 'safe')).toHaveLength(4);
  });

  it('draws each guide across the thing it belongs to', () => {
    // A guide with no extent would be an invisible line, which is worse than
    // no snapping at all: the block would jump for no visible reason.
    for (const guide of guides) expect(guide.to).toBeGreaterThan(guide.from);
  });
});
