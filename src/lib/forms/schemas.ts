import { z } from 'zod';

/**
 * Validation shared by the browser and the server.
 *
 * The same schema runs in both places: react-hook-form uses it to give
 * immediate feedback, and the API route uses it to decide what to trust.
 * Anything validated only in the browser is not validated at all, so the server
 * re-runs every rule here on data it has never seen before.
 *
 * The limits exist to keep an abusive payload from becoming an abusive email,
 * and are generous enough that no honest customer will meet them.
 */

const name = z.string().trim().min(2).max(120);
const email = z.string().trim().email().max(160);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** The identity and consent block common to every form on the site. */
const contactBlock = {
  name,
  email,
  phone: optionalText(40),
  /**
   * Explicit, unbundled consent. Under the GDPR consent must be a genuine
   * choice, so this is never pre-ticked and the form cannot be submitted
   * without it — and refusing it simply means no enquiry is sent, not that
   * some lesser service is offered.
   */
  consent: z.literal(true),
  /**
   * Entirely separate from the consent above, and never required.
   * Left as a plain optional rather than given a zod default, so the type the
   * form works with and the type the schema produces stay identical — a
   * `.default()` makes them diverge and react-hook-form then infers the wrong one.
   */
  newsletter: z.boolean().optional(),
  /**
   * A field no human sees. Bots fill in everything they find; a submission
   * with anything here is dropped. Cheaper and more private than a CAPTCHA,
   * which would mean loading a third party's script on a GDPR-careful site.
   */
  website: z.literal('').optional(),
};

/* ── Artwork ──────────────────────────────────────────────────────────── */

/**
 * The server's own check on an uploaded drawing.
 *
 * The browser already ran this SVG through DOMPurify, but that is the
 * attacker's own machine and proves nothing. The server never renders this
 * markup and never inlines it into an email body — it travels as a file
 * attachment — so this is a second, blunter gate: refuse anything carrying the
 * constructs that make an SVG active.
 */
const DANGEROUS = [
  /<script/i,
  /<foreignobject/i,
  /<use\b/i,
  /<image\b/i,
  /\bon[a-z]+\s*=/i,
  /javascript:/i,
  /<!entity/i,
  /<!doctype/i,
  /xlink:href/i,
  /href\s*=/i,
];

export const artworkSchema = z
  .object({
    svg: z.string().max(512_000),
    fileName: z.string().max(120),
    aspect: z.number().finite().positive().max(100),
    widthMm: z.number().finite().min(1).max(1200),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    rotation: z.number().finite().min(-360).max(360),
  })
  .refine((a) => a.svg.includes('<svg'), { message: 'Not an SVG' })
  .refine((a) => !DANGEROUS.some((re) => re.test(a.svg)), {
    message: 'The artwork contains markup that cannot be accepted',
  });

/* ── Sign design ──────────────────────────────────────────────────────── */

const textBlockSchema = z.object({
  id: z.string().max(40),
  content: z.string().max(400),
  fontId: z.string().max(40),
  capHeightMm: z.number().finite().min(1).max(600),
  letterSpacing: z.number().finite().min(-1).max(2),
  lineHeight: z.number().finite().min(0.5).max(5),
  align: z.enum(['left', 'center', 'right']),
  wrap: z.enum(['straight', 'arcUp', 'arcDown', 'circle']),
  curvature: z.number().finite().min(-1).max(1),
  circleRadiusMm: z.number().finite().min(1).max(2000),
  x: z.number().finite().min(-1).max(2),
  y: z.number().finite().min(-1).max(2),
});

export const signDesignSchema = z.object({
  widthMm: z.number().finite().min(10).max(3000),
  heightMm: z.number().finite().min(10).max(3000),
  thicknessMm: z.number().finite().min(5).max(200),
  shape: z.enum(['rect', 'rounded', 'arch', 'oval']),
  edge: z.enum(['square', 'chamfer', 'roundover']),
  woodId: z.enum(['furu', 'al', 'bjork', 'ask', 'ek', 'lonn', 'valnot']),
  method: z.enum(['vcarve', 'pocket', 'raised']),
  finish: z.enum(['raw', 'oil', 'paint', 'oilPaint']),
  paintColour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  texts: z.array(textBlockSchema).max(8),
  artwork: artworkSchema.nullable(),
  decoration: z.object({
    border: z.enum(['none', 'line', 'double', 'inset', 'notch']),
    insetMm: z.number().finite().min(0).max(500),
    corners: z.enum(['none', 'diamond', 'leaf', 'drilled']),
  }),
  hanging: z.enum(['none', 'keyhole', 'rope', 'posts']),
});

/* ── The three submissions ────────────────────────────────────────────── */

/**
 * What the order form itself collects.
 *
 * Split out from the full order because the form has no business validating
 * the design: that is carried in the designer's own store, was already checked
 * as it was built, and would otherwise drag a hundred-field object through
 * react-hook-form for no benefit.
 */
export const signOrderContactSchema = z.object({
  ...contactBlock,
  message: optionalText(2000),
  delivery: z.enum(['pickup', 'ship']),
  address: optionalText(300),
  /** The customer has been shown, and acknowledged, the withdrawal-right rule. */
  withdrawalAcknowledged: z.literal(true),
  locale: z.enum(['sv', 'en']),
});

/** What actually reaches the server: the form, plus the design and a picture. */
export const signOrderSchema = signOrderContactSchema.extend({
  design: signDesignSchema,
  /**
   * A PNG data URL of the preview, attached to the email. Optional by design:
   * if the browser could not rasterise it, the written specification is the
   * authoritative document and the order should go regardless.
   */
  previewPng: z
    .string()
    .max(6_000_000)
    .regex(/^data:image\/png;base64,/)
    .optional(),
});

/**
 * One form for everything that is not a sign from the designer.
 *
 * Custom work and a plain message used to be two pages asking nearly the same
 * questions. They are one now: the subject decides whether a project needs a
 * timeframe, and everything else is shared.
 *
 * Budget is gone. It was optional, it made people uneasy, and a workshop that
 * has read the description can propose something and let the customer react to
 * a number rather than name one first.
 */
export const enquirySchema = z
  .object({
    ...contactBlock,
    kind: z.enum(['furniture', 'sign', 'other']),
    description: z.string().trim().min(20).max(4000),
    timeframe: z.enum(['flexible', 'months', 'date']),
    date: optionalText(40),
    locale: z.enum(['sv', 'en']),
  })
  // A date is only meaningful for the option that asks for one.
  .refine((v) => v.timeframe !== 'date' || Boolean(v.date), {
    path: ['date'],
    message: 'A date is needed for this timeframe',
  });

export type SignOrderContactInput = z.infer<typeof signOrderContactSchema>;
export type SignOrderInput = z.infer<typeof signOrderSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
