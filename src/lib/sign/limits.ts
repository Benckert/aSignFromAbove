import { safeArea, type Sign, type TextBlock } from './model';
import type { BlockBox } from './store';
import { minCapMm } from './text';

/**
 * How large and how small a block's letters may be, in millimetres of capital.
 *
 * The ceiling is solved rather than searched for. Every dimension of the box
 * scales linearly with cap height — the font size does, and the tracking is a
 * fraction of the font size — so one measurement at the current size gives the
 * largest size that still fits the safe area, exactly, for this word in this
 * face on this board.
 *
 * Which is why the measurement carries the cap height it was taken at. Reading
 * the current one off the block instead pairs a fresh size with last frame's
 * box for a single render, and a single render is enough to snap the lettering
 * to a size nobody asked for.
 *
 * The floor comes from the face and the finest cutter, and is the same one the
 * rest of the designer uses to decide whether a name will go on a board at all.
 */
export interface CapLimits {
  min: number;
  max: number;
}

export function capLimits(sign: Sign, block: TextBlock, box: BlockBox | null): CapLimits {
  const min = minCapMm(block.fontId);

  if (!box || box.widthMm <= 0 || box.heightMm <= 0) {
    // Before the first measurement. A generous ceiling, so the size control is
    // not pinned to its floor for the one frame before the answer arrives.
    return { min, max: Math.max(min, 200) };
  }

  const safe = safeArea(sign);
  const fit = Math.min(safe.width / box.widthMm, safe.height / box.heightMm);
  return { min, max: Math.max(Math.floor(box.capMm * fit), min) };
}

/**
 * How far the letters may grow back before it is worth moving them.
 *
 * Set type is very nearly proportional to its cap height, but not exactly:
 * hinting and sub-pixel rounding move a measured box a fraction either way.
 * Without a dead band, a block sitting at its ceiling can measure a millimetre
 * larger at the new size, shrink, measure smaller again, and grow — a twitch
 * that never settles. Two millimetres ends it, at the cost of occasionally
 * stopping a millimetre below the theoretical maximum, which is a millimetre
 * nobody will see.
 */
export const GROW_SLACK_MM = 2;

/** What a block's cap height should become, given what has been measured. */
export function settledCapMm(
  sign: Sign,
  block: TextBlock,
  box: BlockBox | null,
  wantedMm: number | undefined,
): number {
  const { max } = capLimits(sign, block, box);
  const current = block.capHeightMm;
  if (current > max) return max;

  const wanted = wantedMm ?? current;
  return wanted > current && max >= current + GROW_SLACK_MM ? Math.min(wanted, max) : current;
}

/**
 * Where a block's centre should sit, so that its box stays on the board.
 *
 * Worked out at the size the block is about to become rather than the one it
 * has, so that position and size are never corrected against two different
 * pictures of the same lettering.
 */
export function settledPosition(
  sign: Sign,
  block: TextBlock,
  box: BlockBox | null,
  capMm: number,
): { xMm: number; yMm: number } {
  if (!box) return { xMm: block.xMm, yMm: block.yMm };
  const safe = safeArea(sign);
  const scale = block.capHeightMm > 0 ? capMm / block.capHeightMm : 1;
  const halfWidth = (box.widthMm * scale) / 2;
  const halfHeight = (box.heightMm * scale) / 2;
  return {
    xMm: centre(block.xMm, safe.x + halfWidth, safe.x + safe.width - halfWidth),
    yMm: centre(block.yMm, safe.y + halfHeight, safe.y + safe.height - halfHeight),
  };
}

/** Clamps, but centres the value when the box is wider than the room it has. */
function centre(value: number, low: number, high: number): number {
  return low > high ? (low + high) / 2 : Math.min(Math.max(value, low), high);
}
