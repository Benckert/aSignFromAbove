'use client';

import { useEffect } from 'react';
import { settledCapMm, settledPosition } from '@/lib/sign/limits';
import { useSign } from '@/lib/sign/store';

/**
 * Keeps every block inside a board that has changed underneath it, and brings
 * them back when it makes room again.
 *
 * Choosing a smaller board, a shape that gives up its corners, or a border that
 * takes a margin away does not touch the lettering — so without this the words
 * stay exactly as large and exactly where they were, and hang over the edge.
 * That is the failure this designer shipped twice, in two different disguises,
 * and the cause both times was the same: a rule applied where a value is
 * entered rather than wherever the value can become wrong.
 *
 * So it is applied here, against whatever the board currently is, on every
 * render. Shrinking letters can only loosen the constraint and moving them
 * cannot tighten it, so one pass settles it.
 *
 * Shrinking alone is not enough, though, and shipping only half of this is what
 * made the previous designer feel like it was fighting back. Type a long name
 * and the letters shrink to fit, as they must; delete it, type a short one, and
 * the sign keeps the small letters a word that is no longer there imposed on
 * it. Every other tool would have grown them again. So the size asked for is
 * remembered, and the letters return to it as soon as there is room.
 */
export function useFitBlocks(): void {
  const sign = useSign((s) => s.sign);
  const boxes = useSign((s) => s.boxes);
  const wanted = useSign((s) => s.wanted);

  /*
    After every render, with no dependency list. Every input to the fit is a
    reason to run it — the board, the shape, the border, each block's words,
    face, size, tracking and position — and listing them would be a second copy
    of what the render already depends on, and the first thing to fall out of
    step. It writes only when something differs, so it settles rather than
    loops.
  */
  useEffect(() => {
    const fixes = new Map<string, { capHeightMm: number; xMm: number; yMm: number }>();

    for (const block of sign.blocks) {
      const box = boxes[block.id];
      if (!box) continue;
      const capHeightMm = settledCapMm(sign, block, box, wanted[block.id]);
      const { xMm, yMm } = settledPosition(sign, block, box, capHeightMm);
      if (capHeightMm === block.capHeightMm && xMm === block.xMm && yMm === block.yMm) continue;
      fixes.set(block.id, { capHeightMm, xMm, yMm });
    }

    if (fixes.size === 0) return;

    // Applied by id against whatever the state is by the time this runs, and
    // only to the three fields in question, so a correction can never carry a
    // stale copy of the words back over a newer one.
    useSign.getState().live((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        const fix = fixes.get(block.id);
        return fix ? { ...block, ...fix } : block;
      }),
    }));
  });
}
