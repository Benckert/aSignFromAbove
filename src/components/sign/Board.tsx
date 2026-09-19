'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { capLimits } from '@/lib/sign/limits';
import { safeArea, type Sign, type TextBlock } from '@/lib/sign/model';
import { blockGuides, boardGuides, snapBox, type Box, type Guide } from '@/lib/sign/snap';
import { useSign, type BlockBox } from '@/lib/sign/store';
import { isBlank } from '@/lib/sign/text';
import { SignFace } from './SignFace';
import { cx } from '@/lib/cx';

/**
 * The board, and everything a pointer can do to it.
 *
 * The sign is drawn in a viewBox measured in millimetres, which is what makes
 * the whole interaction honest: a pointer position becomes a position on the
 * board through the SVG's own matrix, so there is no scale factor to keep in
 * step and dragging is exact at any size of window. Every number that leaves
 * this component is a millimetre on a real piece of wood.
 *
 * What you can do: click a block to select it, drag it to move it, drag the
 * handle at its corner to size it, nudge it with the arrow keys, or
 * double-click bare wood to start another one. What you cannot do is stretch a
 * block — the handle scales uniformly, because squashing a face narrows its
 * vertical strokes, and stroke width is exactly what decides whether the bit
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
  id: string;
  mode: 'move' | 'size';
  /** Where in the block the pointer took hold, in mm. */
  grabX: number;
  grabY: number;
  /** For sizing: the cap height and pointer distance when the gesture began. */
  startCap: number;
  startDistance: number;
  moved: boolean;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface BoardProps {
  className?: string;
  label: string;
  /**
   * Where the selected block is on screen, in client coordinates, so the
   * controls for it can sit beside it rather than across the room.
   */
  onSelectedRect?: (rect: Rect | null) => void;
  /** Asked for by a double-click on a block, or Enter on a selected one. */
  onEdit?: () => void;
  /** Quietens the board's own overlays while the words are being typed. */
  editing?: boolean;
  emptyLabel: string;
}

export function Board({
  className,
  label,
  onSelectedRect,
  onEdit,
  editing,
  emptyLabel,
}: BoardProps) {
  const sign = useSign((s) => s.sign);
  const boxes = useSign((s) => s.boxes);
  const selectedId = useSign((s) => s.selectedId);
  const select = useSign((s) => s.select);
  const live = useSign((s) => s.live);
  const mark = useSign((s) => s.mark);
  const measured = useSign((s) => s.measured);
  const want = useSign((s) => s.want);
  const addBlock = useSign((s) => s.addBlock);

  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [readout, setReadout] = useState<string | null>(null);

  const safe = safeArea(sign);

  /* ── The frame ─────────────────────────────────────────────────────── */

  const boardW = sign.widthMm + PAD * 2;
  const boardH = sign.heightMm + PAD * 2;
  const frameW = Math.max(boardW, boardH * FRAME_ASPECT);
  const frameH = Math.max(boardH, boardW / FRAME_ASPECT);
  const originX = -PAD - (frameW - boardW) / 2;
  const originY = -PAD - (frameH - boardH) / 2;

  /* ── Where each block is ───────────────────────────────────────────── */

  /**
   * Every block's rectangle in board millimetres.
   *
   * The block stores where its centre should be and the measurement says how
   * big it came out; the two meet here. The selection frame, the handle and
   * everything that snaps to anything are all derived from this one map, so
   * there is no second idea of where a block is that could disagree with the
   * first.
   *
   * A block nobody has typed into yet still gets a rectangle. Without one an
   * empty block is a dead end — no words means no box, no box means nothing to
   * click, and nothing to click means no way back to having words.
   */
  const rects = useMemo(() => {
    const out = new Map<string, Box>();
    for (const block of sign.blocks) {
      const box = boxes[block.id];
      const width = box?.widthMm ?? safe.width * 0.5;
      const height = box?.heightMm ?? block.capHeightMm * 1.5;
      out.set(block.id, {
        x: block.xMm - width / 2,
        y: block.yMm - height / 2,
        width,
        height,
      });
    }
    return out;
  }, [sign.blocks, boxes, safe.width]);

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

  /* ── Gestures ──────────────────────────────────────────────────────── */

  const startDrag = (event: React.PointerEvent, block: TextBlock, mode: Drag['mode']) => {
    const at = toBoard(event.clientX, event.clientY);
    if (!at) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    select(block.id);

    const dx = at.x - block.xMm;
    const dy = at.y - block.yMm;
    drag.current = {
      pointerId: event.pointerId,
      id: block.id,
      mode,
      grabX: dx,
      grabY: dy,
      startCap: block.capHeightMm,
      startDistance: Math.max(Math.hypot(dx, dy), 0.001),
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const block = sign.blocks.find((b) => b.id === gesture.id);
    const rect = rects.get(gesture.id);
    if (!block || !rect) return;
    const at = toBoard(event.clientX, event.clientY);
    if (!at) return;

    // The first movement of a gesture is what goes into the history, so undo
    // steps over the whole drag rather than each frame of it.
    if (!gesture.moved) {
      gesture.moved = true;
      mark();
    }

    if (gesture.mode === 'move') {
      const wanted = {
        x: at.x - gesture.grabX - rect.width / 2,
        y: at.y - gesture.grabY - rect.height / 2,
        width: rect.width,
        height: rect.height,
      };
      /*
        The board's own lines, and the other blocks'. Two lines of a sign
        sharing a centre is the commonest layout there is, and hitting it
        exactly is the difference between a sign that looks made and one that
        looks nearly made.
      */
      const others = sign.blocks
        .filter((b) => b.id !== gesture.id && rects.has(b.id))
        .flatMap((b) => blockGuides(rects.get(b.id)!));
      const snapped = snapBox(
        wanted,
        [
          ...boardGuides({ x: 0, y: 0, width: sign.widthMm, height: sign.heightMm }, safe),
          ...others,
        ],
        SNAP_PIXELS * mmPerPixel(),
        event.altKey,
      );
      setGuides(snapped.guides);
      // The centre, because that is what a block is positioned by and what the
      // guides are lining up — the top-left corner of a word is not a number
      // anybody is thinking about.
      setReadout(
        `${Math.round(snapped.x + rect.width / 2)} × ${Math.round(snapped.y + rect.height / 2)} mm`,
      );
      live((current) => ({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === gesture.id
            ? { ...b, xMm: snapped.x + rect.width / 2, yMm: snapped.y + rect.height / 2 }
            : b,
        ),
      }));
      return;
    }

    // Uniform scaling only. The handle's distance from the block's centre is
    // the whole gesture, so dragging it diagonally, sideways or up does the
    // same thing — there is no aspect ratio to get wrong.
    const { min, max } = capLimits(sign, block, boxes[block.id] ?? null);
    const distance = Math.hypot(at.x - block.xMm, at.y - block.yMm);
    const capHeightMm = Math.min(
      Math.max(Math.round((gesture.startCap * distance) / gesture.startDistance), min),
      max,
    );
    setGuides([]);
    setReadout(`${capHeightMm} mm`);
    // Sizing by hand is a request, not just a result: let go of a long word on
    // a small board and the letters stay where they were put, rather than
    // springing back to a size chosen before the word was there.
    want(gesture.id, capHeightMm);
    live((current) => ({
      ...current,
      blocks: current.blocks.map((b) => (b.id === gesture.id ? { ...b, capHeightMm } : b)),
    }));
  };

  const endDrag = (event: React.PointerEvent) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setGuides([]);
    setReadout(null);
  };

  /* ── Keyboard ──────────────────────────────────────────────────────── */

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!selectedId) return;
    if (event.key === 'Enter' && onEdit) {
      event.preventDefault();
      onEdit();
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    useSign.getState().commit((current) => ({
      ...current,
      blocks: current.blocks.map((b) =>
        b.id === selectedId ? { ...b, xMm: b.xMm + move[0], yMm: b.yMm + move[1] } : b,
      ),
    }));
  };

  /* ── Telling the page where the selected block is ──────────────────── */

  /*
    The floating controls need this in screen coordinates, and the only honest
    source is the SVG's own matrix — the board is letterboxed inside whatever
    space the layout gives it, so nothing about the element's own box predicts
    where a millimetre lands. Measured after layout, and again on anything that
    could move it.
  */
  const selectedRect = selectedId ? rects.get(selectedId) : undefined;
  const report = useCallback(() => {
    if (!onSelectedRect) return;
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix || !selectedRect) {
      onSelectedRect(null);
      return;
    }
    const topLeft = new DOMPoint(selectedRect.x, selectedRect.y).matrixTransform(matrix);
    const bottomRight = new DOMPoint(
      selectedRect.x + selectedRect.width,
      selectedRect.y + selectedRect.height,
    ).matrixTransform(matrix);
    onSelectedRect({
      left: topLeft.x,
      top: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    });
  }, [onSelectedRect, selectedRect]);

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

  const tick = frameW * 0.022;
  const hairline = frameW * 0.0022;

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
        navigation, which is a bad trade for what is on offer — arrow keys that
        nudge, and controls in the panel that do everything else.
      */
      role="group"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={() => select(null)}
      onDoubleClick={() => addBlock()}
    >
      <SignFace sign={sign} uid={uid} boxes={boxes} onMeasure={measured} />

      {/*
        The hairline round the blank, and the thing the page measures to find
        where the board actually is. The SVG is letterboxed inside whatever box
        the layout gives it, so the element's own rectangle is not the board's.
      */}
      <path
        data-board=""
        d={`M 0 0 H ${sign.widthMm} V ${sign.heightMm} H 0 Z`}
        fill="none"
        stroke="none"
        pointerEvents="none"
      />

      {/* ── What you can grab ─────────────────────────────────────────── */}

      {sign.blocks.map((block) => {
        const rect = rects.get(block.id);
        if (!rect) return null;
        const chosen = block.id === selectedId;
        const empty = isBlank(block.text);

        return (
          <g key={block.id}>
            {empty && (
              /* An invitation, so a block with nothing in it is still a place. */
              <g pointerEvents="none">
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={4}
                  fill="transparent"
                  stroke="#c78a48"
                  strokeWidth={hairline}
                  strokeDasharray={`${frameW * 0.012} ${frameW * 0.009}`}
                  opacity={0.65}
                />
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(frameW * 0.03, rect.height * 0.5)}
                  fill="#e0a869"
                >
                  {emptyLabel}
                </text>
              </g>
            )}

            {/*
              The body of the block, as one target. Transparent rather than
              absent: letters are full of holes, and having to hit the stem of
              an 'l' to move a word is not a tool, it is a test.
            */}
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="transparent"
              className={chosen ? 'cursor-move' : 'cursor-pointer'}
              onPointerDown={(event) => startDrag(event, block, 'move')}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onEdit?.();
              }}
            />

            {chosen && (
              <>
                {/*
                  Corner marks rather than a rectangle. The measured box is the
                  font's box, which stands taller than the letters do — a closed
                  frame invites you to read that slack as part of the lettering,
                  where four corners read as what they are, which is a grip.
                */}
                {(
                  [
                    [rect.x, rect.y, 1, 1],
                    [rect.x + rect.width, rect.y, -1, 1],
                    [rect.x, rect.y + rect.height, 1, -1],
                    [rect.x + rect.width, rect.y + rect.height, -1, -1],
                  ] as const
                ).map(([cx0, cy0, sx, sy], index) => (
                  <path
                    key={index}
                    d={`M ${cx0 + sx * tick} ${cy0} H ${cx0} V ${cy0 + sy * tick}`}
                    fill="none"
                    stroke="#c78a48"
                    strokeWidth={hairline * 1.6}
                    strokeLinecap="round"
                    opacity={editing ? 0.95 : 0.7}
                    pointerEvents="none"
                  />
                ))}

                {/*
                  A generous invisible target behind a small visible mark. The
                  mark is the right size for the drawing; the target is the
                  right size for a fingertip.
                */}
                <circle
                  cx={rect.x + rect.width}
                  cy={rect.y + rect.height}
                  r={Math.max(frameW * 0.035, 8)}
                  fill="transparent"
                  className="cursor-nwse-resize"
                  onPointerDown={(event) => startDrag(event, block, 'size')}
                />
                <circle
                  cx={rect.x + rect.width}
                  cy={rect.y + rect.height}
                  r={frameW * 0.009}
                  fill="#f6f1e7"
                  stroke="#8a5a26"
                  strokeWidth={0.6}
                  pointerEvents="none"
                />
              </>
            )}
          </g>
        );
      })}

      {/* ── Guides ────────────────────────────────────────────────────── */}

      {guides.map((guide, index) => (
        <line
          key={index}
          x1={guide.axis === 'x' ? guide.at : guide.from}
          y1={guide.axis === 'x' ? guide.from : guide.at}
          x2={guide.axis === 'x' ? guide.at : guide.to}
          y2={guide.axis === 'x' ? guide.to : guide.at}
          stroke={
            guide.kind === 'centre' ? '#e0a869' : guide.kind === 'block' ? '#c9a7d8' : '#a2bfa3'
          }
          strokeWidth={0.6}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      ))}

      {readout && selectedRect && !editing && (
        <text
          x={selectedRect.x + selectedRect.width / 2}
          y={selectedRect.y - 6}
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

/** Re-exported so callers do not have to know where the box type lives. */
export type { BlockBox, Sign };
