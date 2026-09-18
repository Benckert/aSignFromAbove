'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getWood } from '@/config/woods';
import { isDark, shade } from '@/lib/designer/colour';
import { signOutlinePath } from '@/lib/designer/geometry';
import { WoodDefs } from '@/components/designer/WoodDefs';
import { boardGuides, snapBox, type Guide } from '@/lib/sign/snap';
import { patchBlock, useSign } from '@/lib/sign/store';
import { safeArea } from '@/lib/sign/draft';
import { BoardText, isBlank } from './BoardText';
import { capLimits, useMeasuredLettering } from './useTextBox';
import { cx } from '@/lib/cx';

/**
 * The board, and everything you can do to it with a pointer.
 *
 * The sign is drawn in a viewBox measured in millimetres, which is what makes
 * the whole interaction honest: a pointer position becomes a position on the
 * board through the SVG's own matrix, so there is no scale factor to keep in
 * step and dragging is exact at any size of window. Every number that leaves
 * this component is a millimetre on a real piece of wood.
 *
 * What you can do: drag the lettering to move it, drag the handle at its corner
 * to size it, or select it and nudge with the arrow keys. What you cannot do is
 * stretch it — the handle scales uniformly, because squashing a face narrows
 * its vertical strokes and stroke width is exactly what decides whether the bit
 * can enter the letter.
 */

/** The drawing frame stays this shape whatever the board's proportions are. */
const FRAME_ASPECT = 3 / 2;
/** Breathing room around the board, in mm, for the shadow it casts. */
const PAD = 12;
/** How near a guide has to be to catch, in screen pixels. */
const SNAP_PIXELS = 7;
interface Drag {
  pointerId: number;
  mode: 'move' | 'size';
  /** Where in the block the pointer took hold, in mm. */
  grabX: number;
  grabY: number;
  /** For sizing: the cap height and pointer distance when the gesture began. */
  startCap: number;
  startDistance: number;
  moved: boolean;
}

export interface BoardProps {
  className?: string;
  label: string;
  /**
   * Where the lettering is on screen, in client coordinates, so that the
   * controls for it can sit beside it rather than across the room. Null when
   * there is nothing to point at.
   */
  onLetteringRect?: (
    rect: { top: number; left: number; width: number; height: number } | null,
  ) => void;
  /** Asked for by a double-click, or by Enter on a selected block. */
  onEdit?: () => void;
  /** Quietens the board's own overlays while the words are being typed. */
  editing?: boolean;
  /** Shown on the board when there is nothing written yet. */
  emptyLabel?: string;
}

export function Board({
  className,
  label,
  onLetteringRect,
  onEdit,
  editing,
  emptyLabel = 'Klicka för att skriva',
}: BoardProps) {
  const draft = useSign((s) => s.draft);
  const selected = useSign((s) => s.selected);
  const select = useSign((s) => s.select);
  const live = useSign((s) => s.live);
  const mark = useSign((s) => s.mark);
  const want = useSign((s) => s.want);

  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [readout, setReadout] = useState<string | null>(null);

  const wood = getWood(draft.woodId);
  const size = useSign((s) => s.size);

  const safe = safeArea(draft);

  /* ── The frame ─────────────────────────────────────────────────────── */

  const boardW = draft.widthMm + PAD * 2;
  const boardH = draft.heightMm + PAD * 2;
  const frameW = Math.max(boardW, boardH * FRAME_ASPECT);
  const frameH = Math.max(boardH, boardW / FRAME_ASPECT);
  const originX = -PAD - (frameW - boardW) / 2;
  const originY = -PAD - (frameH - boardH) / 2;

  /* ── Where the lettering is ────────────────────────────────────────── */

  /*
    Where to hang the text so that its box comes out centred on the block's
    position. Zero until the first measurement, and after that a fixed property
    of these particular glyphs at this particular size — so correcting for it
    does not move what is being measured, and one pass settles it.
  */
  const anchorXMm = draft.block.xMm - (size?.offsetXMm ?? 0);
  const anchorYMm = draft.block.yMm - (size?.offsetYMm ?? 0);
  const measure = useMeasuredLettering(draft.block.capHeightMm, anchorXMm, anchorYMm);

  /**
   * The lettering's box, in board millimetres.
   *
   * The block stores where its centre should be and the measurement says how
   * big it came out, and the two meet here. Everything else — the selection
   * frame, the handle, what snaps to what — is derived from this one rectangle,
   * so there is no second idea of where the text is that could disagree with
   * the first.
   *
   * The centre is not measured, only arranged: the anchor above is chosen so
   * that the box lands centred on the position. That is what keeps a drag
   * exact, because a measured centre would always be reporting the frame
   * before last.
   */
  const textBox = useMemo(() => {
    if (!size || isBlank(draft.block.text)) return null;
    return {
      x: draft.block.xMm - size.widthMm / 2,
      y: draft.block.yMm - size.heightMm / 2,
      width: size.widthMm,
      height: size.heightMm,
    };
  }, [size, draft.block.text, draft.block.xMm, draft.block.yMm]);

  /**
   * Where to point when there is nothing written yet.
   *
   * Without this an empty sign is a dead end: no ink means no box, no box
   * means nothing to click, and nothing to click means the only way back to
   * having text is a control that no longer exists. So an empty block still
   * occupies a place on the board, and that place invites a click.
   */
  const placeholder = useMemo(
    () => ({
      x: safe.x + safe.width * 0.12,
      y: safe.y + safe.height * 0.34,
      width: safe.width * 0.76,
      height: safe.height * 0.32,
    }),
    [safe.x, safe.y, safe.width, safe.height],
  );

  /** The lettering when there is any, and the invitation when there is not. */
  const frameBox = textBox ?? placeholder;

  /* ── Pointer arithmetic ────────────────────────────────────────────── */

  /** Screen coordinates to board millimetres, through the SVG's own matrix. */
  const toBoard = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }, []);

  /** How many millimetres a screen pixel is worth right now. */
  const mmPerPixel = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const width = svg.getBoundingClientRect().width;
    return width > 0 ? frameW / width : 1;
  }, [frameW]);

  const { min: minCapMm, max: maxCapMm } = capLimits(draft, size);

  /* ── Gestures ──────────────────────────────────────────────────────── */

  const startDrag = (event: React.PointerEvent, mode: Drag['mode']) => {
    const at = toBoard(event.clientX, event.clientY);
    if (!at || !textBox) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    select(true);

    const dx = at.x - draft.block.xMm;
    const dy = at.y - draft.block.yMm;
    drag.current = {
      pointerId: event.pointerId,
      mode,
      grabX: dx,
      grabY: dy,
      startCap: draft.block.capHeightMm,
      startDistance: Math.max(Math.hypot(dx, dy), 0.001),
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !textBox) return;
    const at = toBoard(event.clientX, event.clientY);
    if (!at) return;

    // The first movement of a gesture is what goes into the history, so that
    // undo steps over the whole drag rather than each frame of it.
    if (!gesture.moved) {
      gesture.moved = true;
      mark();
    }

    if (gesture.mode === 'move') {
      const wanted = {
        x: at.x - gesture.grabX - textBox.width / 2,
        y: at.y - gesture.grabY - textBox.height / 2,
        width: textBox.width,
        height: textBox.height,
      };
      const snapped = snapBox(
        wanted,
        boardGuides({ x: 0, y: 0, width: draft.widthMm, height: draft.heightMm }, safe),
        SNAP_PIXELS * mmPerPixel(),
        event.altKey,
      );
      setGuides(snapped.guides);
      // The centre, because that is what the block is positioned by and what
      // the guides are lining up — the top-left corner of a word is not a
      // number anybody is thinking about.
      setReadout(
        `${Math.round(snapped.x + textBox.width / 2)} × ${Math.round(snapped.y + textBox.height / 2)} mm`,
      );
      live(
        patchBlock({
          xMm: snapped.x + textBox.width / 2,
          yMm: snapped.y + textBox.height / 2,
        }),
      );
      return;
    }

    // Uniform scaling only. The handle's distance from the block's centre is
    // the whole gesture, so dragging it diagonally, sideways or up does the
    // same thing — there is no aspect ratio to get wrong.
    const distance = Math.hypot(at.x - draft.block.xMm, at.y - draft.block.yMm);
    const wanted = (gesture.startCap * distance) / gesture.startDistance;
    const capHeightMm = Math.min(Math.max(Math.round(wanted), minCapMm), maxCapMm);
    setGuides([]);
    setReadout(`${capHeightMm} mm`);
    // Sizing by hand is a request, not just a result: let go of a long word on
    // a small board and the letters stay where they were put, rather than
    // springing back to a size chosen before the word was there.
    want(capHeightMm);
    live(patchBlock({ capHeightMm }));
  };

  const endDrag = (event: React.PointerEvent) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setGuides([]);
    setReadout(null);
  };

  /* ── Keyboard ──────────────────────────────────────────────────────── */

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!selected) return;
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === 'Enter' && onEdit) {
      event.preventDefault();
      onEdit();
      return;
    }

    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    useSign.getState().commit((d) => ({
      ...d,
      block: { ...d.block, xMm: d.block.xMm + move[0], yMm: d.block.yMm + move[1] },
    }));
  };

  /* ── Telling the page where the lettering is ───────────────────────── */

  /*
    The floating controls need this in screen coordinates, and the only honest
    source for that is the SVG's own matrix — the board is letterboxed inside
    whatever space the layout gives it, so nothing about the element's own box
    predicts where a millimetre lands. Measured after layout, and again on
    anything that could move it.
  */
  const report = useCallback(() => {
    if (!onLetteringRect) return;
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) {
      onLetteringRect(null);
      return;
    }
    const topLeft = new DOMPoint(frameBox.x, frameBox.y).matrixTransform(matrix);
    const bottomRight = new DOMPoint(
      frameBox.x + frameBox.width,
      frameBox.y + frameBox.height,
    ).matrixTransform(matrix);
    onLetteringRect({
      left: topLeft.x,
      top: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    });
  }, [onLetteringRect, frameBox]);

  useLayoutEffect(report, [report]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(report);
    observer.observe(svg);
    window.addEventListener('scroll', report, { passive: true, capture: true });
    window.addEventListener('resize', report);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', report, { capture: true });
      window.removeEventListener('resize', report);
    };
  }, [report]);

  /* ── Drawing ───────────────────────────────────────────────────────── */

  const woodIsDark = isDark(wood.colour.base);
  const painted = draft.finish === 'paint' || draft.finish === 'oilPaint';
  const carveFill = painted
    ? draft.paintColour
    : woodIsDark
      ? shade(wood.colour.light, 0.14)
      : shade(wood.colour.dark, -0.42);
  const outlinePath = signOutlinePath(draft.shape, draft.widthMm, draft.heightMm);
  const handle = textBox ? { x: textBox.x + textBox.width, y: textBox.y + textBox.height } : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`${originX} ${originY} ${frameW} ${frameH}`}
      className={cx(
        'touch-none rounded-sm select-none',
        // The ring is drawn inside the frame rather than around it: an outline
        // on a full-width board reads as a page border, not as focus.
        'focus-visible:outline-oak outline-none focus-visible:outline-2 focus-visible:-outline-offset-2',
        className,
      )}
      /*
        A group rather than role="application". The stronger role would hand
        every keystroke to this component and silence the screenreader's own
        navigation, which is a bad trade for what is on offer here — arrow keys
        that nudge, and controls in the panel that do everything else.
      */
      role="group"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={() => select(false)}
    >
      <WoodDefs wood={wood} method={draft.method} uid={uid} />
      <defs>
        <clipPath id={`${uid}-shape`}>
          <path d={outlinePath} />
        </clipPath>
      </defs>

      {/* The shadow the board casts behind it. */}
      <path
        d={outlinePath}
        fill="#2b1f12"
        opacity={0.2}
        transform="translate(2.5, 4)"
        style={{ filter: 'blur(3px)' }}
      />

      <g clipPath={`url(#${uid}-shape)`}>
        <rect x={0} y={0} width={draft.widthMm} height={draft.heightMm} fill={wood.colour.base} />
        <rect
          x={0}
          y={0}
          width={draft.widthMm}
          height={draft.heightMm}
          fill={wood.colour.dark}
          filter={`url(#${uid}-grain)`}
          opacity={0.16 + wood.grainStrength * 0.4}
        />
        {(draft.finish === 'oil' || draft.finish === 'oilPaint') && (
          <rect
            x={0}
            y={0}
            width={draft.widthMm}
            height={draft.heightMm}
            fill={`url(#${uid}-oil)`}
          />
        )}
        <rect
          x={0}
          y={0}
          width={draft.widthMm}
          height={draft.heightMm}
          fill={`url(#${uid}-light)`}
        />
        <rect
          x={0}
          y={0}
          width={draft.widthMm}
          height={draft.heightMm}
          fill={`url(#${uid}-vignette)`}
        />

        <BoardText
          block={draft.block}
          anchorXMm={anchorXMm}
          anchorYMm={anchorYMm}
          textRef={measure}
          widthMm={size?.widthMm}
          fill={carveFill}
          filter={painted ? `url(#${uid}-painted)` : `url(#${uid}-engrave)`}
        />
      </g>

      {/*
        The hairline round the blank, and the thing the page measures to find
        where the board actually is. The SVG is letterboxed inside whatever box
        the layout gives it, so the element's own rectangle is not the board's.
      */}
      <path
        data-board=""
        d={outlinePath}
        fill="none"
        stroke={shade(wood.colour.dark, -0.35)}
        strokeWidth={0.5}
        opacity={0.55}
      />

      {/* ── What you can grab ─────────────────────────────────────────── */}

      {!textBox && (
        <g className="cursor-text" onPointerDown={(e) => e.stopPropagation()} onClick={onEdit}>
          <rect
            x={placeholder.x}
            y={placeholder.y}
            width={placeholder.width}
            height={placeholder.height}
            rx={4}
            fill="transparent"
            stroke="#c78a48"
            strokeWidth={frameW * 0.0025}
            strokeDasharray={`${frameW * 0.012} ${frameW * 0.009}`}
            opacity={0.65}
          />
          <text
            x={placeholder.x + placeholder.width / 2}
            y={placeholder.y + placeholder.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={frameW * 0.032}
            fill="#e0a869"
            pointerEvents="none"
          >
            {emptyLabel}
          </text>
        </g>
      )}

      {textBox && (
        <g>
          {/*
            The body of the lettering, as one target. Transparent rather than
            absent: the letters themselves are full of holes, and having to hit
            the stem of an 'l' to move a word is not a tool, it is a test.
          */}
          <rect
            x={textBox.x}
            y={textBox.y}
            width={textBox.width}
            height={textBox.height}
            fill="transparent"
            className="cursor-move"
            onPointerDown={(event) => startDrag(event, 'move')}
            onDoubleClick={onEdit}
          />

          {selected && (
            <>
              <rect
                x={textBox.x - 2}
                y={textBox.y - 2}
                width={textBox.width + 4}
                height={textBox.height + 4}
                fill="none"
                stroke="#c78a48"
                strokeWidth={frameW * 0.0022}
                opacity={editing ? 0.9 : 0.6}
                pointerEvents="none"
              />
              {handle && (
                <>
                  {/*
                    A generous invisible target behind a small visible mark. The
                    mark is the right size for the drawing; the target is the
                    right size for a fingertip.
                  */}
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r={Math.max(frameW * 0.035, 8)}
                    fill="transparent"
                    className="cursor-nwse-resize"
                    onPointerDown={(event) => startDrag(event, 'size')}
                  />
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r={frameW * 0.009}
                    fill="#f6f1e7"
                    stroke="#8a5a26"
                    strokeWidth={0.6}
                    pointerEvents="none"
                  />
                </>
              )}
            </>
          )}
        </g>
      )}

      {/* ── Guides ────────────────────────────────────────────────────── */}

      {guides.map((guide, index) => (
        <line
          key={index}
          x1={guide.axis === 'x' ? guide.at : guide.from}
          y1={guide.axis === 'x' ? guide.from : guide.at}
          x2={guide.axis === 'x' ? guide.at : guide.to}
          y2={guide.axis === 'x' ? guide.to : guide.at}
          stroke={guide.kind === 'centre' ? '#e0a869' : '#a2bfa3'}
          strokeWidth={0.6}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      ))}

      {readout && textBox && !editing && (
        <text
          x={textBox.x + textBox.width / 2}
          y={textBox.y - 6}
          textAnchor="middle"
          fontSize={frameW * 0.026}
          fill="#f6f1e7"
          stroke="#1a140e"
          strokeWidth={frameW * 0.008}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {readout}
        </text>
      )}
    </svg>
  );
}
