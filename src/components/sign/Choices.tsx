'use client';

import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { WOODS } from '@/config/woods';
import { signOutlinePath } from '@/lib/designer/geometry';
import type { CarveMethod, Finish, SignShape } from '@/lib/designer/types';
import { cx } from '@/lib/cx';

/**
 * The choices that belong to the board rather than to the lettering.
 *
 * Every one of them is shown as the thing it is. A shape is a drawing of that
 * shape, a size is a rectangle in the right proportion, a cut is a section
 * through the groove it leaves, a timber is that timber's own colour. The
 * words are still there underneath, because a name is how you talk to the
 * workshop about it, but nobody should have to read "urgröpt" and picture a
 * flat-bottomed pocket — that is what the picture is for.
 */

/* ── A common shell, so every choice on the page behaves the same ────── */

function Option({
  chosen,
  onClick,
  label,
  detail,
  children,
  className,
  /** Set when this choice would leave the lettering with nowhere to go. */
  disabled,
}: {
  chosen: boolean;
  onClick: () => void;
  label: string;
  detail?: string;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      disabled={disabled}
      title={disabled ? 'Texten får inte plats på en sådan skylt' : undefined}
      onClick={onClick}
      className={cx(
        'group relative flex flex-col items-center gap-1.5 rounded-md border p-2.5 text-center transition',
        'duration-150 ease-[var(--ease-wood)]',
        chosen
          ? 'border-oak bg-surface-2 text-ink shadow-sheet'
          : 'border-rule text-ink-2 hover:border-rule-strong hover:bg-surface-2/60 hover:text-ink',
        disabled && 'pointer-events-none opacity-30',
        className,
      )}
    >
      {children}
      <span className="text-[0.75rem] leading-tight">{label}</span>
      {detail && <span className="spec leading-tight">{detail}</span>}
      {chosen && (
        <Check
          size={11}
          aria-hidden
          className="text-oak absolute top-1.5 right-1.5"
          strokeWidth={3}
        />
      )}
    </button>
  );
}

function Group({
  label,
  children,
  aside,
}: {
  label: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-ink text-[0.8125rem] font-medium">{label}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ── Size ─────────────────────────────────────────────────────────────── */

const SIZES = [
  { label: 'Liten', widthMm: 300, heightMm: 150 },
  { label: 'Mellan', widthMm: 400, heightMm: 220 },
  { label: 'Stor', widthMm: 600, heightMm: 300 },
  { label: 'Bred', widthMm: 800, heightMm: 250 },
] as const;

export function SizeChoice({
  widthMm,
  heightMm,
  onChange,
  canHold,
}: {
  widthMm: number;
  heightMm: number;
  onChange: (size: { widthMm: number; heightMm: number }) => void;
  /** Whether a board of this size could still carry the lettering. */
  canHold?: (size: { widthMm: number; heightMm: number }) => boolean;
}) {
  const matches = SIZES.some((s) => s.widthMm === widthMm && s.heightMm === heightMm);
  const [custom, setCustom] = useState(!matches);

  return (
    <Group
      label="Storlek"
      aside={
        <button
          type="button"
          onClick={() => setCustom((open) => !open)}
          className="text-oak-deep hover:text-ink text-[0.75rem] underline-offset-4 transition hover:underline"
        >
          {custom ? 'Färdiga mått' : 'Egna mått'}
        </button>
      }
    >
      {custom ? (
        <div className="grid grid-cols-2 gap-2">
          <Number
            label="Bredd"
            value={widthMm}
            min={150}
            max={1200}
            step={10}
            onChange={(next) => onChange({ widthMm: next, heightMm })}
          />
          <Number
            label="Höjd"
            value={heightMm}
            min={80}
            max={800}
            step={10}
            onChange={(next) => onChange({ widthMm, heightMm: next })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Storlek">
          {SIZES.map((size) => (
            <Option
              key={size.label}
              chosen={size.widthMm === widthMm && size.heightMm === heightMm}
              disabled={canHold ? !canHold(size) : false}
              onClick={() => onChange({ widthMm: size.widthMm, heightMm: size.heightMm })}
              label={size.label}
              detail={`${size.widthMm}×${size.heightMm}`}
            >
              {/* Drawn to its real proportion, inside a box they all share. */}
              <span className="grid h-7 w-full place-items-center">
                <span
                  className={cx(
                    'block rounded-[2px] border transition',
                    size.widthMm === widthMm && size.heightMm === heightMm
                      ? 'border-oak bg-oak/25'
                      : 'border-rule-strong bg-surface-3 group-hover:border-ink-3',
                  )}
                  style={{
                    width: `${Math.min(size.widthMm / 26, 40)}px`,
                    height: `${Math.min(size.heightMm / 26, 28)}px`,
                  }}
                />
              </span>
            </Option>
          ))}
        </div>
      )}
    </Group>
  );
}

function Number({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => onChange(Math.min(Math.max(next, min), max));
  return (
    <div className="border-rule bg-surface-2 flex items-center justify-between gap-1 rounded-md border px-1 py-1">
      <button
        type="button"
        aria-label={`${label}, mindre`}
        onClick={() => clamp(value - step)}
        className="text-ink-2 hover:bg-surface-3 hover:text-ink grid h-7 w-7 shrink-0 place-items-center rounded-sm transition"
      >
        <Minus size={13} aria-hidden />
      </button>
      <span className="min-w-0 text-center">
        <span className="spec block leading-none">{label}</span>
        <span className="text-ink block font-mono text-[0.8125rem] leading-tight">{value} mm</span>
      </span>
      <button
        type="button"
        aria-label={`${label}, större`}
        onClick={() => clamp(value + step)}
        className="text-ink-2 hover:bg-surface-3 hover:text-ink grid h-7 w-7 shrink-0 place-items-center rounded-sm transition"
      >
        <Plus size={13} aria-hidden />
      </button>
    </div>
  );
}

/* ── Shape ────────────────────────────────────────────────────────────── */

const SHAPES: Array<{ value: SignShape; label: string }> = [
  { value: 'rect', label: 'Rak' },
  { value: 'rounded', label: 'Rundad' },
  { value: 'arch', label: 'Välvd' },
  { value: 'oval', label: 'Oval' },
];

export function ShapeChoice({
  value,
  onChange,
  canHold,
}: {
  value: SignShape;
  onChange: (shape: SignShape) => void;
  /** Whether this shape leaves the lettering enough board to sit on. */
  canHold?: (shape: SignShape) => boolean;
}) {
  return (
    <Group label="Form">
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Form">
        {SHAPES.map((shape) => (
          <Option
            key={shape.value}
            chosen={shape.value === value}
            disabled={canHold ? !canHold(shape.value) : false}
            onClick={() => onChange(shape.value)}
            label={shape.label}
          >
            {/* The same renderer the board uses, at 44 × 26 mm. */}
            <svg viewBox="-1 -1 46 28" className="h-7 w-full" aria-hidden>
              <path
                d={signOutlinePath(shape.value, 44, 26)}
                className={cx(
                  'transition',
                  shape.value === value
                    ? 'fill-oak/25 stroke-oak'
                    : 'fill-surface-3 stroke-rule-strong group-hover:stroke-ink-3',
                )}
                strokeWidth={1.2}
              />
            </svg>
          </Option>
        ))}
      </div>
    </Group>
  );
}

/* ── Timber ───────────────────────────────────────────────────────────── */

export function WoodChoice({
  value,
  locale,
  onChange,
}: {
  value: string;
  locale: 'sv' | 'en';
  onChange: (woodId: string) => void;
}) {
  return (
    <Group label="Träslag">
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Träslag">
        {WOODS.map((wood) => (
          <Option
            key={wood.id}
            chosen={wood.id === value}
            onClick={() => onChange(wood.id)}
            label={wood.name[locale]}
            className="p-1.5"
          >
            <span
              className="block h-9 w-full rounded-sm border border-black/25"
              style={{
                // The timber's own three colours, banded along the grain the
                // way a flat-sawn face bands, so the swatch reads as a piece of
                // wood rather than as a patch of paint. Four degrees off level,
                // because nothing in a tree is perfectly straight.
                backgroundImage: `repeating-linear-gradient(4deg, ${wood.colour.base} 0 3px, ${wood.colour.dark} 3px 4px, ${wood.colour.light} 4px 8px)`,
              }}
            />
          </Option>
        ))}
      </div>
    </Group>
  );
}

/* ── Cut ──────────────────────────────────────────────────────────────── */

/** A section through the groove each cut leaves, 40 × 18. */
const PROFILES: Record<CarveMethod, string> = {
  vcarve: 'M0 4 H14 L20 14 L26 4 H40',
  pocket: 'M0 4 H13 V13 H27 V4 H40',
  raised: 'M0 13 H13 V4 H27 V13 H40',
};

const METHODS: Array<{ value: CarveMethod; label: string }> = [
  { value: 'vcarve', label: 'Skuren' },
  { value: 'pocket', label: 'Urgröpt' },
  { value: 'raised', label: 'Upphöjd' },
];

export function CutChoice({
  value,
  onChange,
}: {
  value: CarveMethod;
  onChange: (method: CarveMethod) => void;
}) {
  return (
    <Group label="Fräsning">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fräsning">
        {METHODS.map((method) => (
          <Option
            key={method.value}
            chosen={method.value === value}
            onClick={() => onChange(method.value)}
            label={method.label}
          >
            <svg viewBox="0 0 40 18" className="h-6 w-full" aria-hidden>
              <path
                d={PROFILES[method.value]}
                fill="none"
                strokeWidth={1.8}
                strokeLinejoin="round"
                className={cx(
                  'transition',
                  method.value === value
                    ? 'stroke-oak'
                    : 'stroke-rule-strong group-hover:stroke-ink-3',
                )}
              />
            </svg>
          </Option>
        ))}
      </div>
    </Group>
  );
}

/* ── Finish ───────────────────────────────────────────────────────────── */

const FINISHES: Array<{ value: Finish; label: string }> = [
  { value: 'raw', label: 'Obehandlad' },
  { value: 'oil', label: 'Olja' },
  { value: 'paint', label: 'Färg i texten' },
  { value: 'oilPaint', label: 'Färg och olja' },
];

export function FinishChoice({
  value,
  onChange,
}: {
  value: Finish;
  onChange: (finish: Finish) => void;
}) {
  return (
    <Group label="Yta">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Yta">
        {FINISHES.map((finish) => (
          <button
            key={finish.value}
            type="button"
            role="radio"
            aria-checked={finish.value === value}
            onClick={() => onChange(finish.value)}
            className={cx(
              'flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition',
              'text-[0.8125rem] duration-150 ease-[var(--ease-wood)]',
              finish.value === value
                ? 'border-oak bg-surface-2 text-ink shadow-sheet'
                : 'border-rule text-ink-2 hover:border-rule-strong hover:bg-surface-2/60 hover:text-ink',
            )}
          >
            <span className="truncate">{finish.label}</span>
            {finish.value === value && (
              <Check size={12} aria-hidden strokeWidth={3} className="text-oak shrink-0" />
            )}
          </button>
        ))}
      </div>
    </Group>
  );
}
