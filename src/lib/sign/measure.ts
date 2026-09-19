'use client';

import { useEffect, useState } from 'react';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import { safeArea, type Sign, type TextBlock } from './model';
import { minCapMm, toLines } from './text';

/**
 * How big some lettering would be — asked before it is drawn.
 *
 * The board measures what it has rendered, which answers every question except
 * the one that matters here: a customer typing a name is asking about text that
 * does not exist yet, and by the time it has been drawn and measured it is
 * already hanging over the edge. So this asks the same engine the same question
 * ahead of time. A canvas lays type out with the faces the page loaded, the
 * same shaping and kerning the SVG will use, and reports the result without
 * anything appearing on screen.
 *
 * What it reproduces is `getBBox`, which is neither the ink nor the font's own
 * box but the union of the two — a ring over an Å reaches past the declared
 * ascent, and a script face's swashes hang past the end of the advance, and
 * getBBox grows to hold both. Checked against a real renderer across seven
 * hundred combinations of face, size, tracking and text; the agreement is
 * within about half a per cent, because both sides are the same layout engine
 * answering the same question.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 *
 * A face has a smallest letter it can be cut at and a board has only so much
 * room, so some names will not go on some boards in some faces at any size at
 * all. This designer's standing rule is that it does not warn about that, it
 * declines to offer it: the word cannot be typed past the point it stops
 * fitting, and the faces, boards, shapes and borders that could not carry what
 * is written cannot be chosen. Nothing scolds, and nothing has to be undone.
 */

/** The size a block would come out at, in board millimetres. */
export interface Predicted {
  widthMm: number;
  heightMm: number;
}

/** Measured large and scaled, which keeps hinting out of the arithmetic. */
const PROBE_PX = 400;

/**
 * How much room to keep back, as a fraction of the board's usable area.
 *
 * The prediction lands within about half a per cent of the drawn box, sometimes
 * a little under. Under is the direction that matters, because a prediction
 * that flatters a name by a millimetre lets it onto a board it then hangs off.
 * Two per cent covers four times the worst error seen, and costs a couple of
 * millimetres on a sign nobody was going to order anyway.
 */
const MARGIN = 0.02;

let context: CanvasRenderingContext2D | null | undefined;
const families = new Map<string, string | null>();

function canvas(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  context =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  return context;
}

/**
 * Turns `var(--carve-cinzel), serif` into the family list the page resolved it
 * to.
 *
 * Read from the element the faces are declared on, not from the root — they are
 * set by a wrapper inside the page, so the root does not have them and asking
 * it there returns nothing at all. That was a real bug in the module this
 * replaces: it asked the root, always got nothing, and silently measured every
 * face as the browser's default serif.
 */
function resolveFamily(cssFamily: string): string | null {
  if (typeof document === 'undefined') return null;
  const cached = families.get(cssFamily);
  if (cached !== undefined) return cached;

  const host = document.querySelector('[data-carving-faces]') ?? document.documentElement;
  const style = getComputedStyle(host);
  let missing = false;
  const resolved = cssFamily.replace(/var\((--[a-z0-9-]+)\)/gi, (whole, name: string) => {
    const value = style.getPropertyValue(name).trim();
    if (!value) missing = true;
    return value || whole;
  });

  // Resolving means a style recalculation, and this is asked once per face on
  // every render of the controls. The declarations are static, so once is
  // enough — but not while it is still coming back empty.
  if (!missing) families.set(cssFamily, resolved);
  return missing ? null : resolved;
}

/**
 * Fetches all nine carving faces, and reports when they are here.
 *
 * Two things are going on, and the second is easy to miss.
 *
 * Nothing may be refused before the faces arrive. The server has no canvas and
 * cannot measure at all, so a browser that started declining choices on its
 * first render would be contradicting the HTML it was handed; and measuring a
 * face against whatever stand-in is covering for it describes a sign nobody is
 * making.
 *
 * And a face is not present merely because the page declared it. Webfonts are
 * fetched when something is drawn in them, so on a sign set in Cinzel, Cinzel
 * is the only one the browser has — asking whether the other eight would hold
 * the words would be answered in a fallback's metrics, if the check did not
 * refuse to answer at all. The designer is the one page where a customer is
 * going to try all nine, and fetching them together up front also stops the
 * face list reflowing as each one lands.
 */
export function useFacesReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    const settle = () => {
      if (live) setReady(true);
    };

    const fonts = document.fonts;
    if (!fonts) {
      // Through a promise even here, so the flag never flips inside the effect
      // that installs it.
      Promise.resolve().then(settle);
      return () => {
        live = false;
      };
    }

    const wanted = CARVING_FONTS.map((face) => resolveFamily(face.cssFamily)).filter(
      (family): family is string => family !== null,
    );

    // A face that will not load is not a reason to hold everything up: the
    // prediction refuses to answer for it and the choice stays available, which
    // is the right way round for something a customer might want.
    Promise.all(
      wanted.map((family) => fonts.load(`${PROBE_PX}px ${family}`).catch(() => null)),
    ).then(settle, settle);

    return () => {
      live = false;
    };
  }, []);

  return ready;
}

/**
 * How large a block of lettering would come out, without drawing it.
 *
 * Null when there is no answer worth having: no canvas, a face whose variable
 * is not on the page, or one the browser has not finished loading. Every caller
 * reads null as "allow it", because a guess is a worse reason to refuse a
 * customer's name than no opinion at all.
 */
export function predict(
  block: Pick<TextBlock, 'fontId' | 'trackingEm' | 'lineSpacing'>,
  text: string,
  capHeightMm: number,
): Predicted | null {
  const ctx = canvas();
  if (!ctx) return null;

  const face = getFont(block.fontId);
  const family = resolveFamily(face.cssFamily);
  if (!family) return null;

  // The face itself, not the list: the list ends in a generic that is always
  // available, so asking about the whole of it answers a different question.
  const primary = family.split(',')[0].trim();
  if (document.fonts && !document.fonts.check(`${PROBE_PX}px ${primary}`)) return null;

  const lines = toLines(face.capsOnly ? text.toUpperCase() : text);
  ctx.font = `${PROBE_PX}px ${family}`;

  const scale = capHeightMm / face.capRatio / PROBE_PX;
  // SVG letter-spacing goes after every character, the last one included, so
  // the advance carries one more gap than the ink does.
  const track = block.trackingEm * PROBE_PX;

  let width = 0;
  let ascent = 0;
  let descent = 0;

  lines.forEach((line, index) => {
    // A blank line still occupies one, and an empty string measures as nothing.
    const content = line || ' ';
    const m = ctx.measureText(content);
    const count = content.length;
    width = Math.max(
      width,
      m.width + count * track,
      m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (count - 1) * track,
    );
    if (index === 0) ascent = Math.max(m.fontBoundingBoxAscent, m.actualBoundingBoxAscent);
    if (index === lines.length - 1) {
      descent = Math.max(m.fontBoundingBoxDescent, m.actualBoundingBoxDescent);
    }
  });

  return {
    widthMm: width * scale,
    heightMm: (lines.length - 1) * capHeightMm * block.lineSpacing + (ascent + descent) * scale,
  };
}

/**
 * Whether this board could carry this block at all.
 *
 * Asked at the smallest letter the face can be cut at, because that is the
 * question: not whether it fits as it stands — the board shrinks it to fit as a
 * matter of course — but whether there is any size at all where it both fits
 * the wood and can be cut. Below that the sign is not a sign, it is a promise
 * the workshop cannot keep.
 */
export function canHold(sign: Sign, block: TextBlock, text: string = block.text): boolean {
  const size = predict(block, text, minCapMm(block.fontId));
  if (!size) return true;
  const safe = safeArea(sign);
  return size.widthMm <= safe.width * (1 - MARGIN) && size.heightMm <= safe.height * (1 - MARGIN);
}

/**
 * Whether this board could carry everything written on it.
 *
 * What the board's own controls ask before offering a smaller size, a shape
 * that gives up its corners, or a border that takes a margin away. Each block
 * is asked separately and against the whole safe area, because blocks are
 * placed freely: two of them do not have to share the room, they only each have
 * to fit in it.
 */
export function canHoldAll(sign: Sign): boolean {
  return sign.blocks.every((block) => canHold(sign, block));
}

/**
 * As much of this text as the board can take.
 *
 * Used where text arrives all at once and refusing the lot would be unhelpful —
 * a pasted name, a held-down key. Typing one character past the limit simply
 * does nothing, which is how every other length limit in a text field behaves.
 */
export function longestFitting(sign: Sign, block: TextBlock, text: string): string {
  if (canHold(sign, block, text)) return text;

  // Bisect on the length: the box only grows as characters are added, so the
  // fitting prefixes are exactly the short ones and there is a single boundary.
  let fits = 0;
  let over = text.length;
  while (over - fits > 1) {
    const middle = Math.floor((fits + over) / 2);
    if (canHold(sign, block, text.slice(0, middle))) fits = middle;
    else over = middle;
  }
  return text.slice(0, fits);
}

/** Whether one more line would still go on the board. */
export function canHoldAnotherLine(sign: Sign, block: TextBlock): boolean {
  // Against a single letter, so what is being asked is whether the board has
  // the height for another line — not whether it could hold some particular
  // words that have not been typed yet.
  return canHold(sign, block, `${block.text}\nX`);
}
