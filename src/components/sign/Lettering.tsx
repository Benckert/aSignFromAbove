'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  CornerDownLeft,
  Minus,
  Plus,
  Type,
} from 'lucide-react';
import { CARVING_FONTS, getFont } from '@/config/carving-fonts';
import { patchBlock, useSign } from '@/lib/sign/store';
import { capLimits } from './useTextBox';
import { cx } from '@/lib/cx';

/**
 * The controls for the lettering, floating beside the lettering.
 *
 * The thing this replaces was a column of labelled fields four hundred pixels
 * away from the sign, which meant every adjustment was a trip: look at the
 * word, look at the panel, find the row, drag, look back. Words, face and size
 * are properties of the text, so they live on the text. What stays in the side
 * panel is what belongs to the board — how big it is, what it is made of, how
 * it is cut.
 *
 * It sits below the lettering by default so it is not covering the thing being
 * changed, and flips above when it would fall off the bottom.
 *
 * On a narrow screen it does not float at all — it drops into the flow beneath
 * the board. A phone's board is about a third of the screen, and any panel
 * floating over it covers the very words being typed; pushing the page down a
 * little is the smaller cost by far.
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GAP = 12;
const WIDTH = 320;
/** How close to the edge of the stage the panel may come, in pixels. */
const EDGE = 8;

/**
 * The most lines one sign will carry.
 *
 * Four is where a carved sign stops being a sign: past it the lettering has to
 * shrink so far to fit the board that it reads as a paragraph cut into wood,
 * and anyone who genuinely needs that is describing something the enquiry form
 * handles better than this tool does.
 */
const MAX_LINES = 4;

export function Lettering({
  rect,
  stage,
  editing,
  onEditingChange,
}: {
  /** Where the lettering is, in client coordinates. */
  rect: Rect | null;
  /** The positioned ancestor this panel is placed inside. */
  stage: HTMLElement | null;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const draft = useSign((s) => s.draft);
  const selected = useSign((s) => s.selected);
  const commit = useSign((s) => s.commit);
  const measured = useSign((s) => s.size);
  const want = useSign((s) => s.want);
  const limits = capLimits(draft, measured);

  const field = useRef<HTMLTextAreaElement | null>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [facesOpen, setFacesOpen] = useState(false);
  const block = draft.block;
  const face = getFont(block.fontId);
  const size = Math.min(Math.max(block.capHeightMm, limits.min), limits.max);
  const lines = block.text.split('\n');

  // Focus follows the intent to edit, and selects what is there so that typing
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
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setFacesOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [facesOpen]);

  /*
    How tall this panel actually is.

    It used to be guessed from the number of lines, and the guess knew nothing
    about the face list — so opening the list added two hundred pixels the
    placement had never been told about, and the last two faces fell off the
    bottom of the screen where they could not be clicked at all. Measuring
    costs one observer and cannot be wrong about anything, including whatever
    this panel grows next.
  */
  useLayoutEffect(() => {
    if (!panel) return;
    // Observing delivers a first measurement of its own, so there is nothing
    // to seed here; the estimate above covers the one frame before it arrives.
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
  }, [block.text, selected]);

  if (!selected || !rect || !stage) return null;

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
    any amount of shuffling to avoid.

    Measured against the stage rather than the window, so it can never end up
    half off the board. The estimate is only ever used for the single frame
    before the first measurement lands.
  */
  const height = panelHeight ?? 104 + lines.length * 26 + (lines.length > 1 ? 40 : 0);
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
    want(next);
    commit(patchBlock({ capHeightMm: next }));
  };

  const addLine = () => {
    if (lines.length >= MAX_LINES) return;
    commit(patchBlock({ text: `${block.text}\n` }));
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
      query: on a phone the panel is docked along the bottom of the stage, and
      only from `lg` up do the measured coordinates take over.
    */
    <div
      ref={setPanel}
      className={cx(
        'z-40 animate-[fade-in_0.16s_var(--ease-wood)]',
        // In the flow on a phone, floating over the stage from lg up.
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
        onChange={(e) => commit(patchBlock({ text: e.target.value.slice(0, 120) }))}
        onFocus={() => onEditingChange(true)}
        onBlur={() => onEditingChange(false)}
        onKeyDown={(e) => {
          // Escape hands the board back. Enter does what Enter does in any
          // other text box — it starts a line — until the sign cannot carry
          // another one.
          if (e.key === 'Escape') e.currentTarget.blur();
          if (e.key === 'Enter' && lines.length >= MAX_LINES) e.preventDefault();
        }}
        rows={1}
        spellCheck={false}
        aria-label="Text på skylten"
        placeholder="Vad ska det stå?"
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
          onClick={() => setFacesOpen((open) => !open)}
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
          <Stepper label="Mindre" onClick={() => step(-1)} disabled={size <= limits.min}>
            <Minus size={13} aria-hidden />
          </Stepper>
          <span className="text-ink w-[3.75rem] text-center font-mono text-[0.8125rem]">
            {size} mm
          </span>
          <Stepper label="Större" onClick={() => step(1)} disabled={size >= limits.max}>
            <Plus size={13} aria-hidden />
          </Stepper>
        </div>
      </div>

      {/*
        A second line is one of the two or three things a sign actually needs —
        a name and a year, a name and a family. Pressing Enter in a box nobody
        has told you is multi-line is not a way of offering it.
      */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={addLine}
          disabled={lines.length >= MAX_LINES}
          className={cx(
            'border-rule text-ink-2 hover:border-rule-strong hover:text-ink flex items-center gap-1.5',
            'rounded-sm border px-2.5 py-1.5 text-[0.75rem] transition',
            'disabled:hover:border-rule disabled:hover:text-ink-2 disabled:opacity-40',
          )}
        >
          <CornerDownLeft size={12} aria-hidden />
          Ny rad
        </button>

        {lines.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Justering"
            className="border-rule ml-auto flex shrink-0 items-center rounded-sm border"
          >
            {(
              [
                ['left', 'Vänster', AlignLeft],
                ['center', 'Centrerad', AlignCenter],
                ['right', 'Höger', AlignRight],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={block.align === value}
                aria-label={label}
                onClick={() => commit(patchBlock({ align: value }))}
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
      </div>

      {facesOpen && (
        <div className="border-rule mt-2 grid max-h-[13rem] grid-cols-2 gap-1 overflow-y-auto border-t pt-2">
          {CARVING_FONTS.map((option) => {
            const chosen = option.id === block.fontId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  commit(patchBlock({ fontId: option.id }));
                  setFacesOpen(false);
                }}
                className={cx(
                  'flex items-center justify-between gap-1 rounded-sm px-2.5 py-2 text-left text-[1rem] transition',
                  chosen ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
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
