import type { WoodId } from '@/config/woods';

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

/** How a line of text is laid out along its baseline. */
export type TextWrap =
  | 'straight'
  /** Bowed upward — the middle of the line sits higher than the ends. */
  | 'arcUp'
  /** Bowed downward. */
  | 'arcDown'
  /** Wrapped around a full circle. */
  | 'circle';

export type TextAlign = 'left' | 'center' | 'right';

export interface TextBlock {
  id: string;
  /** May contain newlines; each line is laid out separately. */
  content: string;
  fontId: string;
  /**
   * Cap height in millimetres — the height of a capital letter on the finished
   * board. Specified in mm rather than points because that is the number that
   * decides whether a bit fits, and the number a customer can picture.
   */
  capHeightMm: number;
  /** Extra tracking, in em. Negative tightens. */
  letterSpacing: number;
  /** Line spacing as a multiple of cap height. */
  lineHeight: number;
  align: TextAlign;
  wrap: TextWrap;
  /**
   * Bend for the arc wraps, −1…1 as a fraction of the maximum useful curvature.
   * Ignored when `wrap` is 'straight' or 'circle'.
   */
  curvature: number;
  /** Radius of the circle wrap, in mm. Ignored for other wraps. */
  circleRadiusMm: number;
  /** Centre position as a fraction of the sign face, 0…1 from top-left. */
  x: number;
  y: number;
}

export interface Artwork {
  /** Sanitised SVG markup. Never stored or rendered without passing the filter. */
  svg: string;
  fileName: string;
  /** Intrinsic aspect ratio, width ÷ height, taken from the source viewBox. */
  aspect: number;
  /** Rendered width on the board, in mm. */
  widthMm: number;
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotation: number;
}

export type BorderStyle = 'none' | 'line' | 'double' | 'inset' | 'notch';
export type CornerStyle = 'none' | 'diamond' | 'leaf' | 'drilled';

export interface Decoration {
  border: BorderStyle;
  /** Distance from the edge of the board to the border, in mm. */
  insetMm: number;
  corners: CornerStyle;
}

export type Hanging = 'none' | 'keyhole' | 'rope' | 'posts';

/** The complete state of one sign. Everything the workshop needs to cut it. */
export interface SignDesign {
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
  texts: TextBlock[];
  artwork: Artwork | null;
  decoration: Decoration;
  hanging: Hanging;
}

/** A price broken into the parts it is built from, all in öre, ex VAT. */
export interface PriceBreakdown {
  materialOre: number;
  setupOre: number;
  carveOre: number;
  finishingOre: number;
  extrasOre: number;
  /** Sum of the above, before VAT, after the minimum-order floor is applied. */
  subtotalOre: number;
  vatOre: number;
  /** What the customer pays. Rounded up to a whole 10 kr. */
  totalOre: number;
  /** Whether the minimum order value raised the price. */
  minimumApplied: boolean;
  /** Estimated machine time, for the workshop's own planning. */
  carveMinutes: number;
}

/** A problem the customer should know about before ordering. */
export interface DesignWarning {
  id: string;
  severity: 'blocking' | 'warning' | 'note';
  /** Which control to send the customer to when they act on it. */
  field: 'size' | 'text' | 'font' | 'method' | 'wood' | 'artwork';
  message: { sv: string; en: string };
}
