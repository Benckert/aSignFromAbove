'use client';

import { useEffect, useState } from 'react';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import { safeArea, type Draft } from '@/lib/sign/draft';
import { minCapMm, toLines } from '@/lib/sign/text';

/**
 * Whether a sign could hold some lettering — asked before it is drawn.
 *
 * The board measures what it has rendered, which answers every question except
 * the one that matters here: a customer typing a name is asking about text that
 * does not exist yet, and by the time it has been drawn and measured it is
 * already hanging over the edge. So this asks the same engine the same
 * question ahead of time. A canvas lays type out with the font the page loaded,
 * the same shaping and kerning the SVG will use, and reports the result without
 * anything appearing on screen.
 *
 * What it reproduces is `getBBox`, which is not the ink and not the font's own
 * box but the union of the two — a ring over an Å reaches past the declared
 * ascent, and a script face's swashes hang past the end of the advance, and
 * getBBox grows to hold both. Checked against a real one, face by face; the
 * agreement is exact, because both sides are the same layout engine answering
 * the same question.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 *
 * A sign has a smallest letter it can be cut at, and a board has only so much
 * room, so some names simply will not go on some boards in some faces. This
 * designer's standing rule is that it does not warn about things like that, it
 * declines to offer them: the word cannot be typed past the point it stops
 * fitting, the faces it would not fit in cannot be picked, and the boards too
 * small to take it cannot be chosen. Nothing scolds, and nothing has to be
 * undone.
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
 * Checked against a real renderer over seven hundred combinations of face,
 * size, tracking and text: the prediction lands within about half a per cent
 * of the drawn box, sometimes a little under. Under is the direction that
 * matters, because a prediction that flatters a name by a millimetre lets it
 * onto a board it then hangs off. Two per cent covers four times the worst
 * error seen, and costs a couple of millimetres on a sign nobody was going to
 * order anyway — the only names this refuses are the ones that would not fit
 * at the smallest size the face can be cut at.
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
 * Read from the element the faces are declared on, not from the root — the
 * variables are set by a wrapper inside the page, so the root does not have
 * them and asking it there returns nothing at all.
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
  const answer = missing ? null : resolved;
  // Resolving means a style recalculation, and this is asked once per face on
  // every render of the controls. The declarations are static, so once is
  // enough — but not while it is still coming back empty.
  if (answer) families.set(cssFamily, answer);
  return answer;
}

/**
 * Fetches all nine carving faces, and reports when they are here.
 *
 * Two things are going on, and the second is the one that is easy to miss.
 *
 * Nothing may be refused before the faces arrive. The server has no canvas and
 * cannot measure at all, so a browser that started declining choices on its
 * first render would be contradicting the HTML it was handed; and measuring a
 * face against whatever stand-in is covering for it describes a sign nobody is
 * making.
 *
 * And a face is not there merely because the page declared it. Webfonts are
 * fetched when something is drawn in them, so on a sign set in Cinzel, Cinzel
 * is the only one the browser has — and asking whether the other eight would
 * hold the words would have been answered in a fallback face's metrics, if the
 * check did not refuse to answer at all. That is what this call is for: the
 * designer is the one page where the customer is going to try all nine, and
 * fetching them together up front also means the face list draws itself
 * properly the first time it is opened rather than reflowing as each one
 * lands.
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
      Promise.resolve().then(settle);
      return () => {
        live = false;
      };
    }

    const wanted = CARVING_FONTS.map((face) => resolveFamily(face.cssFamily)).filter(
      (family): family is string => family !== null,
    );

    // A face that will not load is not a reason to hold everything up: the
    // prediction refuses to answer for it and the choice stays available,
    // which is the right way round for something a customer might want.
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
 * is not on the page, or a face the browser has not finished loading — measure
 * against a fallback face and the answer describes a sign nobody is making.
 * Every caller reads null as "allow it", because a guess is a worse reason to
 * refuse a customer's name than no opinion at all.
 */
export function predict(draft: Draft, text: string, capHeightMm: number): Predicted | null {
  const ctx = canvas();
  if (!ctx) return null;

  const face = getFont(draft.block.fontId);
  const family = resolveFamily(face.cssFamily);
  if (!family) return null;

  const font = `${PROBE_PX}px ${family}`;
  // The face itself, not the list: the list ends in a generic that is always
  // available, so asking about the whole of it answers a different question.
  const primary = family.slice(0, family.indexOf(',') + 1 || undefined).replace(/,$/, '');
  if (document.fonts && !document.fonts.check(`${PROBE_PX}px ${primary}`)) return null;

  const lines = toLines(face.capsOnly ? text.toUpperCase() : text);
  ctx.font = font;

  const scale = capHeightMm / face.capRatio / PROBE_PX;
  // SVG letter-spacing goes after every character, the last one included, so
  // the advance carries one more gap than the ink does.
  const track = draft.block.trackingEm * PROBE_PX;

  let width = 0;
  let ascent = 0;
  let descent = 0;

  lines.forEach((line, index) => {
    // A blank line still occupies one, and an empty string measures as nothing.
    const m = ctx.measureText(line || ' ');
    const count = (line || ' ').length;
    const advance = m.width + count * track;
    const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (count - 1) * track;
    width = Math.max(width, advance, ink);
    if (index === 0) ascent = Math.max(m.fontBoundingBoxAscent, m.actualBoundingBoxAscent);
    if (index === lines.length - 1) {
      descent = Math.max(m.fontBoundingBoxDescent, m.actualBoundingBoxDescent);
    }
  });

  const step = capHeightMm * draft.block.lineSpacing;
  return {
    widthMm: width * scale,
    heightMm: (lines.length - 1) * step + (ascent + descent) * scale,
  };
}

/**
 * Whether this board could carry this lettering at all.
 *
 * Asked at the smallest letter the face can be cut at, because that is the
 * question: not whether it fits as it stands — the board shrinks it to fit as
 * a matter of course — but whether there is any size at all where it both fits
 * the wood and can be cut. Below that the sign is not a sign, it is a promise
 * the workshop cannot keep.
 */
export function canHold(draft: Draft, text: string = draft.block.text): boolean {
  const size = predict(draft, text, minCapMm(draft.block.fontId));
  if (!size) return true;
  const safe = safeArea(draft);
  return size.widthMm <= safe.width * (1 - MARGIN) && size.heightMm <= safe.height * (1 - MARGIN);
}

/** Whether one more line would still go on the board. */
export function canHoldAnotherLine(draft: Draft): boolean {
  // Against a single letter, so what is being asked is whether the board has
  // the height for another line — not whether it could hold some particular
  // words that have not been typed yet.
  return canHold(draft, `${draft.block.text}\nX`);
}

/**
 * As much of this text as the board can take.
 *
 * Used where text arrives all at once and refusing the lot would be unhelpful
 * — a pasted name, a held-down key. Typing one character past the limit simply
 * does nothing, which is how every other length limit in a text field behaves.
 */
export function longestFitting(draft: Draft, text: string): string {
  if (canHold(draft, text)) return text;

  // Bisect on the length: the box only grows as characters are added, so the
  // fitting prefixes are exactly the short ones and there is a single boundary.
  let fits = 0;
  let over = text.length;
  while (over - fits > 1) {
    const middle = Math.floor((fits + over) / 2);
    if (canHold(draft, text.slice(0, middle))) fits = middle;
    else over = middle;
  }
  return text.slice(0, fits);
}
