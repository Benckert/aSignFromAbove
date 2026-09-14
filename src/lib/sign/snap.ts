/**
 * Snapping, and the lines worth snapping to.
 *
 * Not a grid. A grid on a sign is an arbitrary imposition — there is nothing
 * special about a 10 mm interval on a 437 mm board. What a sign actually has is
 * a handful of meaningful lines, and hitting those exactly is the difference
 * between a sign that looks made and one that looks nearly made:
 *
 *   the centre of the board, both ways, because almost every sign is centred;
 *   the edge of the area the border leaves free, because text must clear it;
 *   the edges and centre of the other lettering, because two lines sharing a
 *     centre is the commonest layout there is.
 *
 * Everything that does not land on a guide lands on a whole millimetre, since
 * that is the unit the workshop is given.
 *
 * The tolerance arrives in millimetres but is *decided* in screen pixels by the
 * caller, converted through the current scale. A fixed millimetre tolerance
 * behaves differently at every board size: three millimetres is half a
 * centimetre of cursor travel on a 150 mm plaque and invisible on a 1200 mm
 * board.
 */

export type GuideKind = 'centre' | 'safe' | 'block';

export interface Guide {
  axis: 'x' | 'y';
  /** Where the line sits, in board millimetres. */
  at: number;
  kind: GuideKind;
  /** How far the drawn line extends along the other axis, in mm. */
  from: number;
  to: number;
}

export interface Span {
  min: number;
  max: number;
}

export interface SnapAxisResult {
  /** How far to move, in mm, to honour the strongest nearby guide. */
  delta: number;
  guide: Guide | null;
}

/**
 * The order guides win ties in.
 *
 * A block's own centre landing on the board's centre should beat its left edge
 * landing on a neighbour's left edge by a hair, because the first is what the
 * person meant and the second is a coincidence.
 */
const PRIORITY: Record<GuideKind, number> = { centre: 0, safe: 1, block: 2 };

/**
 * Finds the best guide for one axis of a moving box.
 *
 * Three points on the box can snap — its two edges and its centre — and each
 * can meet any guide. The winner is the smallest movement; ties go to the more
 * meaningful line.
 */
export function snapAxis(span: Span, guides: Guide[], toleranceMm: number): SnapAxisResult {
  const centre = (span.min + span.max) / 2;
  const points = [span.min, centre, span.max];

  let best: SnapAxisResult = { delta: 0, guide: null };
  let bestDistance = Infinity;

  for (const guide of guides) {
    for (const point of points) {
      const delta = guide.at - point;
      const distance = Math.abs(delta);
      if (distance > toleranceMm) continue;

      const better =
        distance < bestDistance - 0.001 ||
        (distance < bestDistance + 0.001 &&
          best.guide !== null &&
          PRIORITY[guide.kind] < PRIORITY[best.guide.kind]);

      if (better) {
        best = { delta, guide };
        bestDistance = distance;
      }
    }
  }

  return best;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  /** The guides that were actually met, for drawing. Empty when none were. */
  guides: Guide[];
}

/**
 * Places a box, honouring guides on both axes independently.
 *
 * Independently on purpose: a block can be centred horizontally while sitting
 * against the top of the safe area, and requiring both to come from the same
 * guide would make one of the two unreachable.
 */
export function snapBox(
  box: Box,
  guides: Guide[],
  toleranceMm: number,
  /** Held down to place something exactly where the cursor is. */
  bypass = false,
): SnapResult {
  if (bypass) return { x: box.x, y: box.y, guides: [] };

  const horizontal = snapAxis(
    { min: box.x, max: box.x + box.width },
    guides.filter((g) => g.axis === 'x'),
    toleranceMm,
  );
  const vertical = snapAxis(
    { min: box.y, max: box.y + box.height },
    guides.filter((g) => g.axis === 'y'),
    toleranceMm,
  );

  const met = [horizontal.guide, vertical.guide].filter((g): g is Guide => g !== null);

  return {
    // Whole millimetres wherever a guide did not claim the position: the value
    // ends up on a drawing, and 137 mm is a measurement where 136.8043 is noise.
    x: horizontal.guide ? box.x + horizontal.delta : Math.round(box.x),
    y: vertical.guide ? box.y + vertical.delta : Math.round(box.y),
    guides: met,
  };
}

/**
 * The lines a board offers, before any lettering is taken into account.
 *
 * `safe` is the area the lettering may occupy — inside the carved border if
 * there is one. Its four edges are guides because running a line of text up
 * against the frame is a deliberate look, and because feeling where the limit
 * is beats being silently clamped at it.
 */
export function boardGuides(board: Box, safe: Box): Guide[] {
  return [
    {
      axis: 'x',
      at: board.x + board.width / 2,
      kind: 'centre',
      from: board.y,
      to: board.y + board.height,
    },
    {
      axis: 'y',
      at: board.y + board.height / 2,
      kind: 'centre',
      from: board.x,
      to: board.x + board.width,
    },
    { axis: 'x', at: safe.x, kind: 'safe', from: safe.y, to: safe.y + safe.height },
    {
      axis: 'x',
      at: safe.x + safe.width,
      kind: 'safe',
      from: safe.y,
      to: safe.y + safe.height,
    },
    { axis: 'y', at: safe.y, kind: 'safe', from: safe.x, to: safe.x + safe.width },
    {
      axis: 'y',
      at: safe.y + safe.height,
      kind: 'safe',
      from: safe.x,
      to: safe.x + safe.width,
    },
  ];
}

/** The lines another block of lettering offers: its edges and its centre. */
export function blockGuides(box: Box): Guide[] {
  const pad = 6;
  const from = { x: box.y - pad, y: box.x - pad };
  const to = { x: box.y + box.height + pad, y: box.x + box.width + pad };
  return [
    { axis: 'x', at: box.x, kind: 'block', from: from.x, to: to.x },
    { axis: 'x', at: box.x + box.width / 2, kind: 'block', from: from.x, to: to.x },
    { axis: 'x', at: box.x + box.width, kind: 'block', from: from.x, to: to.x },
    { axis: 'y', at: box.y, kind: 'block', from: from.y, to: to.y },
    { axis: 'y', at: box.y + box.height / 2, kind: 'block', from: from.y, to: to.y },
    { axis: 'y', at: box.y + box.height, kind: 'block', from: from.y, to: to.y },
  ];
}
