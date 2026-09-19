import { DEFAULT_FONT_ID } from '@/config/carving-fonts';
import { DEFAULT_WOOD, type WoodId } from '@/config/woods';

/**
 * A sign, as the workshop would describe one.
 *
 * Every dimension here is a millimetre on a real piece of wood. The preview is
 * drawn in a viewBox measured in the same millimetres, so a number in this file
 * is the number on the finished board and there is no scale factor anywhere to
 * keep in step.
 *
 * ── What changed, and why ─────────────────────────────────────────────────
 *
 * The model this replaces described a block's position as a *fraction* of a
 * notional safe area. The same two numbers therefore meant somewhere else on a
 * different board, nothing on screen corresponded to anything a customer could
 * point at, and every feature that touched position had to convert twice. A
 * position is millimetres from the top-left of the board now: the same
 * millimetres the preview is drawn in, the pointer converts into, and the
 * workshop measures with.
 *
 * It also carried the shape of a much larger tool — uploaded artwork, corner
 * motifs, five border styles, four ways of bending a line of text round a
 * curve. Most of it was never chosen, and the curved text in particular was
 * where the lettering kept escaping the board, because a bent baseline cannot
 * be measured the way a straight one can. What is left is what a sign actually
 * is.
 */

/** How the lettering is cut. Each has a different look and a different cost. */
export type CarveMethod =
  /** Tapered walls cut with a V-bit. Letters come to a sharp point at depth. */
  | 'vcarve'
  /** Flat-bottomed pockets cleared with a straight cutter. */
  | 'pocket'
  /** Background dropped away so the letters stand proud of the surface. */
  | 'raised';

export type SignShape = 'rect' | 'rounded' | 'arch' | 'oval';

export type EdgeProfile = 'square' | 'chamfer' | 'roundover';

export type Finish =
  /** Sanded, nothing applied. */
  | 'raw'
  /** Hardwax oil, indoors. */
  | 'oil'
  /** Letters filled with paint, surface left bare. */
  | 'paint'
  /** Letters painted and the whole board oiled. */
  | 'oilPaint';

/**
 * A carved line round the edge of the board.
 *
 * Two, where there used to be five plus a set of corner motifs. A border on a
 * carved sign is a frame for the words, and the ones worth having are the ones
 * that read as a frame from across a yard.
 */
export type Border = 'none' | 'line' | 'double';

/** How the finished sign goes on the wall. */
export type Hanging = 'none' | 'keyhole' | 'rope' | 'posts';

export type TextAlign = 'left' | 'center' | 'right';

/**
 * One block of lettering, configured entirely on its own.
 *
 * This is the change the rebuild is really for. A sign is very often a name
 * over a year, or a house name over a family name, and those want different
 * sizes and often different faces — the old model had one block and one set of
 * settings, so "BJÖRKHAGA" and "1953" had to be the same size, which is not a
 * sign anybody makes.
 *
 * Every field here belongs to this block and to nothing else.
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
  align: TextAlign;
  /**
   * The centre of the block's box, in millimetres from the top-left of the
   * board.
   *
   * The centre rather than a corner, so that adding a letter grows the word
   * evenly either side instead of shunting it to the right.
   */
  xMm: number;
  yMm: number;
}

export interface Sign {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  shape: SignShape;
  edge: EdgeProfile;
  woodId: WoodId;
  method: CarveMethod;
  finish: Finish;
  /** Hex colour used when `finish` fills the letters with paint. */
  paintColour: string;
  border: Border;
  hanging: Hanging;
  /** In drawing order, which is also the order the controls list them in. */
  blocks: TextBlock[];
}

/**
 * The most blocks one sign will carry, and the most lines in one of them.
 *
 * Four and four. Past that a carved sign stops being a sign — the lettering has
 * to shrink so far to fit that it reads as a paragraph cut into wood, and
 * anyone who genuinely wants that is describing something the enquiry form
 * handles better than this tool does.
 */
export const MAX_BLOCKS = 4;
export const MAX_LINES = 4;

let counter = 0;

/**
 * A new block, with an id that will not collide.
 *
 * Counter rather than a random string so that two signs built in the same
 * session are diffable, and so nothing here depends on crypto being available
 * — this runs on the server too.
 */
export function makeBlock(over: Partial<TextBlock> = {}): TextBlock {
  counter += 1;
  return {
    id: `b${counter}`,
    text: '',
    fontId: DEFAULT_FONT_ID,
    capHeightMm: 38,
    trackingEm: 0.02,
    lineSpacing: 1.4,
    align: 'center',
    xMm: 0,
    yMm: 0,
    ...over,
  };
}

export function defaultSign(): Sign {
  const widthMm = 400;
  const heightMm = 220;
  return {
    widthMm,
    heightMm,
    thicknessMm: 20,
    shape: 'rounded',
    edge: 'chamfer',
    woodId: DEFAULT_WOOD,
    method: 'vcarve',
    finish: 'oil',
    paintColour: '#1d1813',
    border: 'none',
    hanging: 'keyhole',
    blocks: [
      makeBlock({
        text: 'Björkhaga',
        capHeightMm: 38,
        xMm: widthMm / 2,
        yMm: heightMm / 2,
      }),
    ],
  };
}

/* ── Where things may go ────────────────────────────────────────────────── */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How far in from the edge the border is cut, in millimetres.
 *
 * Derived from the board rather than offered as a control. The old designer had
 * a slider for it, and there is exactly one good answer for any given board —
 * far enough in to read as a frame, not so far in that it crowds the words —
 * so the slider's only real use was getting it wrong. Proportional to the short
 * side, with a floor so a small plaque still gets a visible margin.
 */
export function borderInsetMm(sign: Pick<Sign, 'widthMm' | 'heightMm'>): number {
  return Math.max(8, Math.min(sign.widthMm, sign.heightMm) * 0.055);
}

/** The gap between the two lines of a double border, in millimetres. */
export const BORDER_GAP_MM = 4;

/**
 * How far in from the edge the lettering must stay clear, on account of the
 * border alone.
 *
 * A carved border is a groove in the board, so text crossing it looks like a
 * mistake, because it is one. This is the innermost line plus half its groove
 * plus a little air.
 */
export function borderClearanceMm(sign: Pick<Sign, 'widthMm' | 'heightMm' | 'border'>): number {
  if (sign.border === 'none') return 0;
  const inset = borderInsetMm(sign) + (sign.border === 'double' ? BORDER_GAP_MM : 0);
  return inset + 5;
}

/**
 * The part of the board the lettering may occupy.
 *
 * Two things pull it in, and the stricter of the two wins. A shape gives up
 * area near its edge — a rectangle keeps all of it, an arch loses the sweep
 * across its top, and an oval has no corners at all, so a word that fits the
 * bounding box of an ellipse still runs off the ellipse. And a border is a
 * physical line the words have to clear.
 *
 * Because the ceiling on letter size is solved from this box, it is also the
 * one function that decides whether a customer can set a size that would run
 * their own lettering through their own frame.
 */
export function safeArea(sign: Sign): Box {
  const ratio = sign.shape === 'oval' ? 0.13 : sign.shape === 'arch' ? 0.1 : 0.07;
  const border = borderClearanceMm(sign);
  const mx = Math.max(sign.widthMm * ratio, 8, border);
  const my = Math.max(sign.heightMm * ratio, 8, border);
  // An arch loses more at the top than at the bottom.
  const topExtra = sign.shape === 'arch' ? sign.heightMm * 0.07 : 0;

  // Never collapse to nothing on a small board with a deep border.
  const width = Math.max(sign.widthMm - mx * 2, sign.widthMm * 0.2);
  const height = Math.max(sign.heightMm - my * 2 - topExtra, sign.heightMm * 0.2);
  return {
    x: (sign.widthMm - width) / 2,
    y: (sign.heightMm - height - topExtra) / 2 + topExtra,
    width,
    height,
  };
}

/**
 * Where a new block should go.
 *
 * Under the ones already there when there is room, so that adding a second line
 * of a sign does the obvious thing; centred when the board is empty. The fit
 * rule will pull it inside the safe area afterwards if this lands it short.
 */
export function placeNewBlock(
  sign: Sign,
  boxHeights: Record<string, number>,
): {
  xMm: number;
  yMm: number;
} {
  const safe = safeArea(sign);
  if (sign.blocks.length === 0) {
    return { xMm: sign.widthMm / 2, yMm: sign.heightMm / 2 };
  }
  const lowest = sign.blocks.reduce((low, block) => {
    const half = (boxHeights[block.id] ?? block.capHeightMm) / 2;
    return Math.max(low, block.yMm + half);
  }, safe.y);
  return {
    xMm: sign.widthMm / 2,
    yMm: Math.min(lowest + safe.height * 0.16, safe.y + safe.height),
  };
}

/* ── Bringing a saved sign back ─────────────────────────────────────────── */

const SHAPES: SignShape[] = ['rect', 'rounded', 'arch', 'oval'];
const EDGES: EdgeProfile[] = ['square', 'chamfer', 'roundover'];
const METHODS: CarveMethod[] = ['vcarve', 'pocket', 'raised'];
const FINISHES: Finish[] = ['raw', 'oil', 'paint', 'oilPaint'];
const BORDERS: Border[] = ['none', 'line', 'double'];
const HANGINGS: Hanging[] = ['none', 'keyhole', 'rope', 'posts'];
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : fallback;
}

/**
 * Rebuilds a sign from whatever was in storage.
 *
 * Anything can be in there. A design saved before a field existed, one saved
 * after a field was removed, one a browser extension has been through, one
 * hand-edited out of curiosity. The type says `Sign`; the bytes say nothing of
 * the sort, and the last time this was taken on trust a restored design walked
 * straight past every constraint in the designer and drew itself off the edge
 * of the board.
 *
 * So every field is checked and every bad one is replaced with the default. It
 * cannot fail and it cannot throw: the worst case is the sign the designer
 * would have opened with anyway.
 *
 * What it deliberately does not do is check that the lettering fits. That is
 * not knowable here — it depends on measurements only a browser that has loaded
 * the faces can take — so it is the fit rule's job, on the first frame after
 * the sign appears.
 */
export function reviveSign(raw: unknown): Sign {
  const base = defaultSign();
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Record<string, unknown>;

  const widthMm = number(saved.widthMm, base.widthMm, 80, 2000);
  const heightMm = number(saved.heightMm, base.heightMm, 60, 1200);

  const blocks = (Array.isArray(saved.blocks) ? saved.blocks : [])
    .slice(0, MAX_BLOCKS)
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object')
    .map((b) =>
      makeBlock({
        text: typeof b.text === 'string' ? b.text.slice(0, 120) : '',
        fontId: typeof b.fontId === 'string' ? b.fontId : base.blocks[0].fontId,
        capHeightMm: number(b.capHeightMm, 38, 4, 400),
        trackingEm: number(b.trackingEm, 0.02, -0.1, 0.6),
        lineSpacing: number(b.lineSpacing, 1.4, 1, 3),
        align: oneOf(b.align, ALIGNS, 'center'),
        xMm: number(b.xMm, widthMm / 2, 0, widthMm),
        yMm: number(b.yMm, heightMm / 2, 0, heightMm),
      }),
    );

  return {
    widthMm,
    heightMm,
    thicknessMm: number(saved.thicknessMm, base.thicknessMm, 10, 60),
    shape: oneOf(saved.shape, SHAPES, base.shape),
    edge: oneOf(saved.edge, EDGES, base.edge),
    // The wood catalogue is the authority on which timbers exist; an unknown
    // one falls back rather than leaving the preview with no colour to draw.
    woodId: (typeof saved.woodId === 'string' ? saved.woodId : base.woodId) as WoodId,
    method: oneOf(saved.method, METHODS, base.method),
    finish: oneOf(saved.finish, FINISHES, base.finish),
    paintColour:
      typeof saved.paintColour === 'string' && /^#[0-9a-f]{6}$/i.test(saved.paintColour)
        ? saved.paintColour
        : base.paintColour,
    border: oneOf(saved.border, BORDERS, base.border),
    hanging: oneOf(saved.hanging, HANGINGS, base.hanging),
    // A sign with nothing on it is a legitimate state to be restored into; a
    // sign with no block at all is not, because there would be nothing to type
    // into and no way to make one.
    blocks: blocks.length > 0 ? blocks : [makeBlock({ xMm: widthMm / 2, yMm: heightMm / 2 })],
  };
}
