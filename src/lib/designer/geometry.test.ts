import { describe, expect, it } from 'vitest';
import {
  arcRadius,
  arcTextPath,
  circleTextPath,
  signOutlinePath,
  safeArea,
  shapeCoverage,
  snap,
  stackedRadius,
  toLines,
} from './geometry';

describe('signOutlinePath', () => {
  it('produces a closed path for every shape', () => {
    for (const shape of ['rect', 'rounded', 'arch', 'oval'] as const) {
      const d = signOutlinePath(shape, 400, 200);
      expect(d.startsWith('M')).toBe(true);
      expect(d.trim().endsWith('Z')).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it('stays finite for extreme aspect ratios', () => {
    for (const shape of ['rect', 'rounded', 'arch', 'oval'] as const) {
      expect(signOutlinePath(shape, 1200, 60)).not.toMatch(/NaN|Infinity/);
      expect(signOutlinePath(shape, 60, 600)).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('arcRadius', () => {
  it('is infinite when the line is flat', () => {
    expect(arcRadius(400, 0)).toBe(Infinity);
  });

  it('shrinks as curvature grows', () => {
    expect(arcRadius(400, 0.9)).toBeLessThan(arcRadius(400, 0.2));
  });

  it('is always at least half the chord', () => {
    // Otherwise the arc could not span the chord at all.
    for (const c of [0.1, 0.5, 1]) {
      expect(arcRadius(400, c)).toBeGreaterThanOrEqual(200);
    }
  });

  it('treats negative curvature as its magnitude', () => {
    expect(arcRadius(400, -0.5)).toBeCloseTo(arcRadius(400, 0.5));
  });
});

describe('arcTextPath', () => {
  it('emits a finite arc command', () => {
    const d = arcTextPath('arcUp', 200, 100, 300, 0.5);
    expect(d).toContain('A');
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('falls back to a straight line when flat', () => {
    expect(arcTextPath('arcUp', 200, 100, 300, 0)).toContain('H');
  });

  it('sweeps the opposite way for a downward arc', () => {
    const up = arcTextPath('arcUp', 200, 100, 300, 0.5);
    const down = arcTextPath('arcDown', 200, 100, 300, 0.5);
    expect(up).not.toBe(down);
  });
});

describe('circleTextPath', () => {
  it('is finite and well formed', () => {
    expect(circleTextPath(100, 100, 50)).not.toMatch(/NaN|Infinity/);
  });

  it('starts at the bottom so centred text lands at the top', () => {
    // Centred text sits at 50 % of the path length; starting at the bottom of
    // a clockwise circle puts that halfway point at twelve o'clock.
    expect(circleTextPath(100, 100, 50).startsWith('M 100 150')).toBe(true);
  });

  it('uses two half-arcs rather than one self-closing arc', () => {
    // A single arc that returns to its own start is degenerate per the SVG
    // spec, and browsers lay text along it inconsistently — which put the
    // lettering off the board entirely. Two halves are unambiguous.
    const d = circleTextPath(100, 100, 50);
    expect(d.match(/A /g)).toHaveLength(2);
    expect(d).not.toContain('Z');
  });

  it('returns to its starting point', () => {
    const d = circleTextPath(100, 100, 50);
    expect(d.startsWith('M 100 150')).toBe(true);
    expect(d.trim().endsWith('100 150')).toBe(true);
  });

  it('passes through the top at the halfway mark', () => {
    expect(circleTextPath(100, 100, 50)).toContain('100 50');
  });

  it('survives a zero radius without producing a broken path', () => {
    expect(circleTextPath(100, 100, 0)).not.toMatch(/NaN|Infinity/);
  });
});

describe('stackedRadius', () => {
  it('nests lines inward for an upward arc', () => {
    expect(stackedRadius(200, 1, 20, 'arcUp')).toBeLessThan(200);
  });

  it('pushes lines outward for a downward arc', () => {
    expect(stackedRadius(200, 1, 20, 'arcDown')).toBeGreaterThan(200);
  });

  it('never collapses to zero or below', () => {
    expect(stackedRadius(30, 10, 20, 'arcUp')).toBeGreaterThan(0);
  });

  it('passes infinity straight through', () => {
    expect(stackedRadius(Infinity, 2, 20, 'arcUp')).toBe(Infinity);
  });
});

describe('toLines', () => {
  it('splits on newlines', () => {
    expect(toLines('a\nb')).toEqual(['a', 'b']);
  });

  it('drops trailing blank lines but keeps interior ones', () => {
    expect(toLines('a\n\nb\n\n')).toEqual(['a', '', 'b']);
  });

  it('keeps a single empty line rather than returning nothing', () => {
    expect(toLines('')).toEqual(['']);
  });
});

describe('safeArea', () => {
  it('stays inside the board for every shape', () => {
    for (const shape of ['rect', 'rounded', 'arch', 'oval'] as const) {
      const area = safeArea(shape, 400, 200);
      expect(area.x).toBeGreaterThan(0);
      expect(area.y).toBeGreaterThan(0);
      expect(area.x + area.width).toBeLessThanOrEqual(400);
      expect(area.y + area.height).toBeLessThanOrEqual(200);
    }
  });

  it('leaves an oval less room than a rectangle', () => {
    expect(safeArea('oval', 400, 200).width).toBeLessThan(safeArea('rect', 400, 200).width);
  });
});

describe('shapeCoverage', () => {
  it('gives a rectangle full coverage and an oval π/4', () => {
    expect(shapeCoverage('rect')).toBe(1);
    expect(shapeCoverage('oval')).toBeCloseTo(Math.PI / 4);
  });
});

describe('snap', () => {
  it('rounds to the nearest step', () => {
    expect(snap(407, 10)).toBe(410);
    expect(snap(403, 10)).toBe(400);
  });
});
