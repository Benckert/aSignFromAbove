import { DEFAULT_FONT_ID } from '@/config/carving-fonts';
import { DEFAULT_WOOD, type WoodId } from '@/config/woods';
import type { CarveMethod, EdgeProfile, Finish, SignDesign, SignShape } from '@/lib/designer/types';

/**
 * The sign, as the rebuilt designer sees it.
 *
 * Deliberately smaller than the model it will eventually replace. One block of
 * lettering, no wrap, no decoration, no artwork: enough to judge whether
 * dragging a real outline around a board is the right way to design a sign,
 * and nothing that would have to be unpicked if it is not.
 *
 * The one structural difference from the old model is worth naming. There, a
 * block's position was a *fraction* of a notional safe area, which meant the
 * same numbers put the text somewhere else on a different board and nothing on
 * screen corresponded to anything a customer could point at. Here a position is
 * millimetres from the top-left of the board — the same millimetres the preview
 * is drawn in, the same ones the workshop measures in, and the same ones the
 * pointer converts into.
 */
export interface TextBlock {
  id: string;
  /** May contain newlines. */
  text: string;
  fontId: string;
  /** Height of a capital on the finished board, in mm. */
  capHeightMm: number;
  /** Extra tracking, as a fraction of the em. */
  trackingEm: number;
  /** Baseline to baseline, as a multiple of cap height. */
  lineSpacing: number;
  align: 'left' | 'center' | 'right';
  /**
   * The centre of the block's ink, in millimetres from the top-left of the board.
   *
   * The centre rather than a corner, so that adding a letter grows the word
   * evenly either side instead of shunting it to the right.
   */
  xMm: number;
  yMm: number;
}

export interface Draft {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  shape: SignShape;
  edge: EdgeProfile;
  woodId: WoodId;
  method: CarveMethod;
  finish: Finish;
  paintColour: string;
  block: TextBlock;
}

export function defaultDraft(): Draft {
  return {
    widthMm: 400,
    heightMm: 220,
    thicknessMm: 20,
    shape: 'rounded',
    edge: 'chamfer',
    woodId: DEFAULT_WOOD,
    method: 'vcarve',
    finish: 'oil',
    paintColour: '#1d1813',
    block: {
      id: 'block',
      text: 'Björkhaga',
      fontId: DEFAULT_FONT_ID,
      capHeightMm: 38,
      trackingEm: 0.02,
      lineSpacing: 1.5,
      align: 'center',
      xMm: 200,
      yMm: 110,
    },
  };
}

/**
 * The part of the board the lettering may occupy.
 *
 * Inset by a proportion of the board, and by more where the shape gives its
 * corners away: a rectangle keeps all of its area, an arch loses the sweep
 * across its top, and an oval has no corners at all, so a word that fits the
 * bounding box of an ellipse still runs off the ellipse. The arch is taken in
 * further at the top than the bottom for the same reason.
 *
 * When this designer grows a carved border, this is the one function that has
 * to learn about it.
 */
export function safeArea(draft: Draft) {
  const ratio = draft.shape === 'oval' ? 0.13 : draft.shape === 'arch' ? 0.1 : 0.07;
  const x = Math.max(draft.widthMm * ratio, 8);
  const y = Math.max(draft.heightMm * ratio, 8);
  const topExtra = draft.shape === 'arch' ? draft.heightMm * 0.07 : 0;
  return {
    x,
    y: y + topExtra,
    width: draft.widthMm - x * 2,
    height: draft.heightMm - y * 2 - topExtra,
  };
}

/**
 * Presents the draft to the existing price engine.
 *
 * The pricing is good and is not what is being rebuilt, so rather than fork it
 * the draft is expressed in the shape it already understands. The fields this
 * designer does not offer yet are given the values that mean "none", so a sign
 * drawn here costs exactly what the same sign drawn in the old tool costs.
 */
export function toSignDesign(draft: Draft): SignDesign {
  return {
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    thicknessMm: draft.thicknessMm,
    shape: draft.shape,
    edge: draft.edge,
    woodId: draft.woodId,
    method: draft.method,
    finish: draft.finish,
    paintColour: draft.paintColour,
    texts: [
      {
        id: draft.block.id,
        content: draft.block.text,
        fontId: draft.block.fontId,
        capHeightMm: draft.block.capHeightMm,
        letterSpacing: draft.block.trackingEm,
        lineHeight: draft.block.lineSpacing,
        align: draft.block.align,
        wrap: 'straight',
        curvature: 0,
        circleRadiusMm: 0,
        x: draft.block.xMm / draft.widthMm,
        y: draft.block.yMm / draft.heightMm,
      },
    ],
    artwork: null,
    decoration: { border: 'none', insetMm: 0, corners: 'none' },
    hanging: 'none',
  };
}

export type { CarveMethod, EdgeProfile, Finish, SignShape, WoodId };
