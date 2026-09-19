'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  CornerDownLeft,
  Minus,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import { capLimits } from '@/lib/sign/limits';
import { canHold, canHoldAnotherLine, longestFitting, useFacesReady } from '@/lib/sign/measure';
import { MAX_LINES } from '@/lib/sign/model';
import { useSign } from '@/lib/sign/store';
import type { Rect } from './Board';
import { cx } from '@/lib/cx';

/**
 * The controls for one block of lettering, floating beside that lettering.
 *
 * What this replaces was a column of labelled fields four hundred pixels from
 * the sign, which made every adjustment a trip: look at the word, look at the
 * panel, find the row, drag, look back. Words, face, size and alignment are
 * properties of the text, so they live on the text. What stays in the side
 * panel is what belongs to the board — how big it is, what it is made of, how
 * it is cut.
 *
 * It sits below the lettering by default so it is not covering the thing being
 * changed, flips above when there is no room below, and is pushed back inside
 * the board when it fits in neither.
 *
 * On a narrow screen it does not float at all — it drops into the flow beneath
 * the board. A phone's board is about a third of the screen, and any panel over
 * it covers the very words being typed; pushing the page down is the smaller
 * cost by far.
 */

const GAP = 12;
const WIDTH = 320;
/** How close to the edge of the stage the panel may come, in pixels. */
const EDGE = 8;

export function BlockPanel({
  rect,
  stage,
  editing,
  onEditingChange,
}: {
  /** Where the selected block is, in client coordinates. */
  rect: Rect | null;
  /** The positioned ancestor this panel is placed inside. */
  stage: HTMLElement | null;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const t = useTranslations('designer');
  // Nothing may be refused before the faces are here to be measured against.
  const facesReady = useFacesReady();
  const sign = useSign((s) => s.sign);
  const selectedId = useSign((s) => s.selectedId);
  const boxes = useSign((s) => s.boxes);
  const patch = useSign((s) => s.patch);
  const want = useSign((s) => s.want);
  const removeBlock = useSign((s) => s.removeBlock);

  const field = useRef<HTMLTextAreaElement | null>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  /*
    Which block the face list was opened for, rather than merely whether it is
    open. Select another block and it is closed for that one, without an effect
    reaching in to close it after the fact — the list belongs to a block, so
    saying so is both shorter and impossible to get out of step.
  */
  const [facesOpenFor, setFacesOpenFor] = useState<string | null>(null);

  const block = sign.blocks.find((b) => b.id === selectedId) ?? null;
  const facesOpen = facesOpenFor !== null && facesOpenFor === selectedId;
  const setFacesOpen = (open: boolean) => setFacesOpenFor(open ? selectedId : null);

  // Focus follows the intent to edit, and selects what is there so typing
  // replaces the old words rather than appending to them.
  useEffect(() => {
    if (!editing) return;
    const node = field.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [editing]);

  useEffect(() => {
    if (!facesOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setFacesOpenFor(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [facesOpen]);

  /*
    How tall this panel actually is.

    It used to be guessed from the number of lines, and the guess knew nothing
    about the face list — so opening the list added two hundred pixels the
    placement had never been told about, and the last two faces fell off the
    bottom of the screen where they could not be clicked at all. Measuring costs
    one observer and cannot be wrong about anything, including whatever this
    panel grows next.
  */
  useLayoutEffect(() => {
    if (!panel) return;
    // Observing delivers a first measurement of its own, so there is nothing to
    // seed here; the estimate below covers the one frame before it arrives.
    const observer = new ResizeObserver(() => setPanelHeight(panel.offsetHeight));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panel]);

  // Grow the field to its content, so two lines of text look like two lines.
  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [block?.text, selectedId]);

  /*
    Which faces this sign could actually be cut in.

    A face the words will not fit in at any cuttable size is not offered, rather
    than offered and then complained about. Worked out from the words and the
    board alone, so dragging the lettering around does not set nine text
    measurements going on every frame.
  */
  const unusable = useMemo(() => {
    const out = new Set<string>();
    if (!block || !facesReady) return out;
    for (const option of CARVING_FONTS) {
      if (option.id === block.fontId) continue;
      if (!canHold(sign, { ...block, fontId: option.id })) out.add(option.id);
    }
    return out;
    // Position cannot change whether the lettering fits, only where it sits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    facesReady,
    block?.text,
    block?.fontId,
    block?.trackingEm,
    block?.lineSpacing,
    sign.widthMm,
    sign.heightMm,
    sign.shape,
    sign.border,
  ]);

  if (!block || !rect || !stage) return null;

  const face = getFont(block.fontId);
  const limits = capLimits(sign, block, boxes[block.id] ?? null);
  const size = Math.min(Math.max(block.capHeightMm, limits.min), limits.max);
  const lines = block.text.split('\n');
  const roomForALine = canHoldAnotherLine(sign, block);
  const canAddLine = lines.length < MAX_LINES && roomForALine;

  /* ── Placing it ────────────────────────────────────────────────────── */

  const bounds = stage.getBoundingClientRect();
  const relative = {
    top: rect.top - bounds.top,
    left: rect.left - bounds.left,
    width: rect.width,
    height: rect.height,
  };

  /*
    Below the lettering by default, above it when there is no room below, and
    pushed back inside the stage when it fits in neither — in that order,
    because the panel covering the words being typed is the one outcome worth
    any amount of shuffling to avoid. Measured against the stage rather than the
    window, so it can never end up half off the board.
  */
  const height = panelHeight ?? 150 + lines.length * 26;
  const below = relative.top + relative.height + GAP;
  const above = relative.top - height - GAP;
  const top =
    below + height <= bounds.height - EDGE
      ? below
      : above >= EDGE
        ? above
        : Math.max(Math.min(below, bounds.height - height - EDGE), EDGE);
  const left = Math.min(
    Math.max(relative.left + relative.width / 2 - WIDTH / 2, EDGE),
    Math.max(bounds.width - WIDTH - EDGE, EDGE),
  );

  const step = (by: number) => {
    const next = Math.min(Math.max(size + by, limits.min), limits.max);
    want(block.id, next);
    patch(block.id, { capHeightMm: next });
  };

  const addLine = () => {
    if (!canAddLine) return;
    patch(block.id, { text: `${block.text}\n` });
    onEditingChange(true);
    // Put the caret on the new line rather than wherever it happened to be.
    requestAnimationFrame(() => {
      const node = field.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    });
  };

  return (
    /*
      One positioned element, not two. The offsets are handed over as custom
      properties because an inline style cannot be made conditional on a media
      query: on a phone the panel is in the flow under the board, and only from
      `lg` up do the measured coordinates take over.
    */
    <div
      ref={setPanel}
      className={cx(
        'z-40 animate-[fade-in_0.16s_var(--ease-wood)]',
        'mt-3 w-full',
        'lg:absolute lg:top-[var(--y)] lg:left-[var(--x)] lg:mt-0 lg:w-[var(--w)]',
        'border-rule-strong bg-surface/95 shadow-lift rounded-lg border p-2.5 backdrop-blur-md',
      )}
      style={
        {
          '--x': `${left}px`,
          '--y': `${top}px`,
          '--w': `${WIDTH}px`,
        } as React.CSSProperties
      }
    >
      <textarea
        ref={field}
        value={block.text}
        /*
          Two limits, both of them silent. A hundred and twenty characters is
          the most any sign here carries; beyond that, what the board itself can
          hold — type or paste past either and nothing happens, the way a text
          field with a length limit behaves. The alternative is letting the
          words run off the edge of the wood and then explaining why.
        */
        onChange={(e) =>
          patch(block.id, { text: longestFitting(sign, block, e.target.value.slice(0, 120)) })
        }
        onFocus={() => onEditingChange(true)}
        onBlur={() => onEditingChange(false)}
        onKeyDown={(e) => {
          // Escape hands the board back. Enter does what Enter does in any
          // other text box — it starts a line — until the sign cannot carry
          // another one.
          if (e.key === 'Escape') e.currentTarget.blur();
          if (e.key === 'Enter' && !canAddLine) e.preventDefault();
        }}
        rows={1}
        spellCheck={false}
        aria-label={t('block.label')}
        placeholder={t('block.placeholder')}
        className={cx(
          'text-ink block w-full resize-none rounded-sm bg-transparent px-2 py-1.5 leading-snug',
          'placeholder:text-ink-3 text-[1.125rem] outline-none',
          'focus:bg-surface-2',
        )}
        style={{ fontFamily: face.cssFamily }}
      />

      <div className="border-rule mt-1.5 flex items-center gap-1.5 border-t pt-2">
        {/* The face, named in itself. */}
        <button
          type="button"
          onClick={() => setFacesOpen(!facesOpen)}
          aria-expanded={facesOpen}
          className={cx(
            'flex min-w-0 flex-1 items-center gap-2 rounded-sm border px-2.5 py-1.5 text-left transition',
            facesOpen
              ? 'border-oak bg-surface-2 text-ink'
              : 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink',
          )}
        >
          <Type size={14} aria-hidden className="text-ink-3 shrink-0" />
          <span className="truncate text-[0.9375rem]" style={{ fontFamily: face.cssFamily }}>
            {face.capsOnly ? face.label.toUpperCase() : face.label}
          </span>
        </button>

        {/* Size, in the millimetres that go on the drawing. */}
        <div className="border-rule flex shrink-0 items-center rounded-sm border">
          <Stepper
            label={t('block.smaller')}
            onClick={() => step(-1)}
            disabled={size <= limits.min}
          >
            <Minus size={13} aria-hidden />
          </Stepper>
          <span className="text-ink w-[3.75rem] text-center font-mono text-[0.8125rem]">
            {size} mm
          </span>
          <Stepper label={t('block.larger')} onClick={() => step(1)} disabled={size >= limits.max}>
            <Plus size={13} aria-hidden />
          </Stepper>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        {/*
          A second line is one of the two or three things a sign actually needs
          — a name and a year, a name and a family. Pressing Enter in a box
          nobody has told you is multi-line is not a way of offering it.
        */}
        <button
          type="button"
          onClick={addLine}
          disabled={!canAddLine}
          className={cx(
            'border-rule text-ink-2 hover:border-rule-strong hover:text-ink flex items-center gap-1.5',
            'rounded-sm border px-2.5 py-1.5 text-[0.75rem] transition',
            'disabled:hover:border-rule disabled:hover:text-ink-2 disabled:opacity-40',
          )}
        >
          <CornerDownLeft size={12} aria-hidden />
          {t('block.newLine')}
        </button>

        {lines.length > 1 && (
          <div
            role="radiogroup"
            aria-label={t('text.align')}
            className="border-rule flex shrink-0 items-center rounded-sm border"
          >
            {(
              [
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const
            ).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={block.align === value}
                aria-label={t(`aligns.${value}`)}
                onClick={() => patch(block.id, { align: value })}
                className={cx(
                  'grid h-8 w-8 place-items-center transition first:rounded-l-sm last:rounded-r-sm',
                  block.align === value
                    ? 'bg-surface-3 text-ink'
                    : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon size={13} aria-hidden />
              </button>
            ))}
          </div>
        )}

        {/* Only offered while there is another block to fall back to. */}
        {sign.blocks.length > 1 && (
          <button
            type="button"
            onClick={() => removeBlock(block.id)}
            aria-label={t('block.remove')}
            title={t('block.remove')}
            className="text-ink-3 hover:bg-surface-2 hover:text-ink ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-sm transition"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        )}
      </div>

      {facesOpen && (
        <div className="border-rule mt-2 grid max-h-[13rem] grid-cols-2 gap-1 overflow-y-auto border-t pt-2">
          {CARVING_FONTS.map((option) => {
            const chosen = option.id === block.fontId;
            const tooWide = unusable.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={tooWide}
                // Said once, quietly, for anyone who wonders why it is greyed.
                title={tooWide ? t('block.faceTooWide') : undefined}
                onClick={() => {
                  patch(block.id, { fontId: option.id });
                  setFacesOpen(false);
                }}
                className={cx(
                  'flex items-center justify-between gap-1 rounded-sm px-2.5 py-2 text-left text-[1rem] transition',
                  chosen ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  tooWide && 'pointer-events-none opacity-30',
                )}
                style={{ fontFamily: option.cssFamily }}
              >
                <span className="truncate">
                  {option.capsOnly ? option.label.toUpperCase() : option.label}
                </span>
                {chosen && <Check size={13} aria-hidden className="text-oak shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-ink-2 hover:bg-surface-3 hover:text-ink grid h-8 w-8 place-items-center transition disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
