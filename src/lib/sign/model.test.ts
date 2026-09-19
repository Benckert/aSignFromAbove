import { describe, expect, it } from 'vitest';
import {
  borderClearanceMm,
  borderInsetMm,
  defaultSign,
  makeBlock,
  placeNewBlock,
  safeArea,
  type Sign,
} from './model';

const sign = (over: Partial<Sign> = {}): Sign => ({ ...defaultSign(), ...over });

describe('a new block', () => {
  it('gets an id of its own every time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeBlock().id));
    expect(ids.size).toBe(50);
  });

  it('starts empty, so a board with one on it is not yet a sign', () => {
    expect(makeBlock().text).toBe('');
  });
});

describe('the safe area', () => {
  it('sits inside the board', () => {
    const s = sign();
    const safe = safeArea(s);
    expect(safe.x).toBeGreaterThan(0);
    expect(safe.y).toBeGreaterThan(0);
    expect(safe.x + safe.width).toBeLessThan(s.widthMm);
    expect(safe.y + safe.height).toBeLessThan(s.heightMm);
  });

  it('gives up more of a shape that gives up its corners', () => {
    // A word that fits the bounding box of an ellipse still runs off the
    // ellipse, so an oval has to keep less of its board than a rectangle does.
    const area = (s: Sign) => safeArea(s).width * safeArea(s).height;
    expect(area(sign({ shape: 'oval' }))).toBeLessThan(area(sign({ shape: 'rect' })));
    expect(area(sign({ shape: 'arch' }))).toBeLessThan(area(sign({ shape: 'rect' })));
  });

  it('starts lower down on an arch, which loses its top', () => {
    expect(safeArea(sign({ shape: 'arch' })).y).toBeGreaterThan(
      safeArea(sign({ shape: 'rect' })).y,
    );
  });

  it('always clears the border, whatever the board', () => {
    /*
      The rule that stops a customer running their own lettering through their
      own frame, stated as the invariant rather than as a comparison — because
      which constraint actually binds depends on the board. A 400 × 220 sign
      already keeps 28 mm clear for the sake of its rounded corners, which is
      more than its border asks for, so there the border changes nothing; on a
      800 × 250 sign the shape wants 17.5 mm off the top and the border wants
      more, so there it does. Both are correct, and only the invariant is worth
      asserting.
    */
    for (const shape of ['rect', 'rounded', 'arch', 'oval'] as const) {
      for (const border of ['line', 'double'] as const) {
        for (const [widthMm, heightMm] of [
          [300, 150],
          [400, 220],
          [600, 300],
          [800, 250],
          [1200, 300],
        ]) {
          const s = sign({ shape, border, widthMm, heightMm });
          const safe = safeArea(s);
          // A hundredth of a millimetre, because the safe area is arrived at by
          // halving a difference and the border by multiplying a proportion, so
          // the two land on the same number without landing on the same float.
          const clearance = borderClearanceMm(s) - 0.01;
          const where = `${shape}/${border}/${widthMm}×${heightMm}`;
          const clears = {
            left: safe.x >= clearance,
            top: safe.y >= clearance,
            right: s.widthMm - safe.x - safe.width >= clearance,
            bottom: s.heightMm - safe.y - safe.height >= clearance,
          };
          expect(`${where} ${JSON.stringify(clears)}`).toBe(
            `${where} {"left":true,"top":true,"right":true,"bottom":true}`,
          );
        }
      }
    }
  });

  it('is pulled in by a border when the shape was not already asking for more', () => {
    // A long shallow board: its height gives up only 7 %, which a double border
    // easily exceeds.
    const wide = { shape: 'rect', widthMm: 800, heightMm: 250 } as const;
    expect(safeArea(sign({ ...wide, border: 'double' })).height).toBeLessThan(
      safeArea(sign({ ...wide, border: 'none' })).height,
    );
  });

  it('never collapses to nothing on a small board with a deep border', () => {
    const s = sign({ widthMm: 150, heightMm: 80, border: 'double', shape: 'oval' });
    const safe = safeArea(s);
    expect(safe.width).toBeGreaterThan(0);
    expect(safe.height).toBeGreaterThan(0);
  });
});

describe('the border', () => {
  it('is set in from the edge in proportion to the board', () => {
    expect(borderInsetMm({ widthMm: 800, heightMm: 400 })).toBeGreaterThan(
      borderInsetMm({ widthMm: 300, heightMm: 150 }),
    );
  });

  it('keeps a visible margin even on a small plaque', () => {
    expect(borderInsetMm({ widthMm: 100, heightMm: 60 })).toBeGreaterThanOrEqual(8);
  });

  it('asks nothing of the lettering when there is no border', () => {
    expect(borderClearanceMm(sign({ border: 'none' }))).toBe(0);
  });
});

describe('placing a new block', () => {
  it('goes in the middle of an empty board', () => {
    const s = sign({ blocks: [] });
    expect(placeNewBlock(s, {})).toEqual({ xMm: s.widthMm / 2, yMm: s.heightMm / 2 });
  });

  it('goes below what is already there', () => {
    const s = sign();
    const first = s.blocks[0];
    const placed = placeNewBlock(s, { [first.id]: 60 });
    expect(placed.yMm).toBeGreaterThan(first.yMm);
  });

  it('stays on the board however much is already on it', () => {
    const s = sign();
    const placed = placeNewBlock(s, { [s.blocks[0].id]: 500 });
    const safe = safeArea(s);
    expect(placed.yMm).toBeLessThanOrEqual(safe.y + safe.height);
  });
});
