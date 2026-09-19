'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, Plus } from 'lucide-react';
import { WOODS } from '@/config/woods';
import type {
  Border,
  CarveMethod,
  EdgeProfile,
  Finish,
  Hanging,
  SignShape,
} from '@/lib/sign/model';
import { signOutlinePath } from '@/lib/sign/geometry';
import { cx } from '@/lib/cx';

/**
 * The choices that belong to the board rather than to the lettering.
 *
 * Every one of them is shown as the thing it is. A shape is a drawing of that
 * shape, a size is a rectangle in the right proportion, a cut is a section
 * through the groove it leaves, a timber is that timber's own colour. The words
 * are still there underneath, because a name is how you talk to the workshop
 * about it, but nobody should have to read "urgröpt" and picture a
 * flat-bottomed pocket — that is what the picture is for.
 *
 * Several of these can be refused. A board too small to carry what is written,
 * a shape that gives up the corners the words are using, a border that takes
 * the margin they need: each is offered only while it could actually be
 * honoured. The caller decides, because only the caller can measure.
 */

/* ── A common shell, so every choice on the page behaves the same ────── */

function Option({
  chosen,
  onClick,
  label,
  detail,
  children,
  className,
  disabled,
  blockedLabel,
}: {
  chosen: boolean;
  onClick: () => void;
  label: string;
  detail?: string;
  children?: React.ReactNode;
  className?: string;
  /** Set when this choice would leave the lettering with nowhere to go. */
  disabled?: boolean;
  blockedLabel?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      disabled={disabled}
      title={disabled ? blockedLabel : undefined}
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

export interface Size {
  widthMm: number;
  heightMm: number;
}

const SIZES: (Size & { key: 'small' | 'medium' | 'large' | 'wide' })[] = [
  { key: 'small', widthMm: 300, heightMm: 150 },
  { key: 'medium', widthMm: 400, heightMm: 220 },
  { key: 'large', widthMm: 600, heightMm: 300 },
  { key: 'wide', widthMm: 800, heightMm: 250 },
];

export function SizeChoice({
  widthMm,
  heightMm,
  onChange,
  canHold,
}: {
  widthMm: number;
  heightMm: number;
  onChange: (size: Size) => void;
  /** Whether a board of this size could still carry the lettering. */
  canHold: (size: Size) => boolean;
}) {
  const t = useTranslations('designer');
  const matches = SIZES.some((s) => s.widthMm === widthMm && s.heightMm === heightMm);
  const [custom, setCustom] = useState(!matches);

  return (
    <Group
      label={t('sections.shape')}
      aside={
        <button
          type="button"
          onClick={() => setCustom((open) => !open)}
          className="text-oak-deep hover:text-ink text-[0.75rem] underline-offset-4 transition hover:underline"
        >
          {custom ? t('presets.standard') : t('presets.custom')}
        </button>
      }
    >
      {custom ? (
        <div className="grid grid-cols-2 gap-2">
          <Number
            label={t('size.width')}
            value={widthMm}
            min={150}
            max={1200}
            step={10}
            onChange={(next) => onChange({ widthMm: next, heightMm })}
            allowed={(next) => canHold({ widthMm: next, heightMm })}
          />
          <Number
            label={t('size.height')}
            value={heightMm}
            min={80}
            max={800}
            step={10}
            onChange={(next) => onChange({ widthMm, heightMm: next })}
            allowed={(next) => canHold({ widthMm, heightMm: next })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('sections.shape')}>
          {SIZES.map((size) => (
            <Option
              key={size.key}
              chosen={size.widthMm === widthMm && size.heightMm === heightMm}
              disabled={!canHold(size)}
              blockedLabel={t('block.choiceBlocked')}
              onClick={() => onChange({ widthMm: size.widthMm, heightMm: size.heightMm })}
              label={t(`presets.${size.key}`)}
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
  allowed,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** A size the lettering could not survive is not offered, the same as a preset. */
  allowed: (value: number) => boolean;
}) {
  const nudge = (by: number) => {
    const next = Math.min(Math.max(value + by, min), max);
    if (next !== value && allowed(next)) onChange(next);
  };
  const canGo = (by: number) => {
    const next = Math.min(Math.max(value + by, min), max);
    return next !== value && allowed(next);
  };

  return (
    <label className="border-rule flex items-center justify-between gap-1 rounded-md border px-1 py-1">
      <span className="text-ink-3 pl-1.5 text-[0.75rem]">{label}</span>
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => nudge(-step)}
          disabled={!canGo(-step)}
          aria-label={`${label} −`}
          className="text-ink-2 hover:bg-surface-3 hover:text-ink grid h-7 w-7 place-items-center rounded-sm transition disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={12} aria-hidden />
        </button>
        <span className="text-ink w-[3.25rem] text-center font-mono text-[0.8125rem]">{value}</span>
        <button
          type="button"
          onClick={() => nudge(step)}
          disabled={!canGo(step)}
          aria-label={`${label} +`}
          className="text-ink-2 hover:bg-surface-3 hover:text-ink grid h-7 w-7 place-items-center rounded-sm transition disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus size={12} aria-hidden />
        </button>
      </span>
    </label>
  );
}

/* ── Shape and edge ───────────────────────────────────────────────────── */

const SHAPES: SignShape[] = ['rect', 'rounded', 'arch', 'oval'];

export function ShapeChoice({
  value,
  onChange,
  canHold,
}: {
  value: SignShape;
  onChange: (shape: SignShape) => void;
  canHold: (shape: SignShape) => boolean;
}) {
  const t = useTranslations('designer');
  return (
    <Group label={t('size.shape')}>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('size.shape')}>
        {SHAPES.map((shape) => (
          <Option
            key={shape}
            chosen={shape === value}
            disabled={!canHold(shape)}
            blockedLabel={t('block.choiceBlocked')}
            onClick={() => onChange(shape)}
            label={t(`shapes.${shape}`)}
          >
            {/* The same renderer the board uses, at 44 × 26 mm. */}
            <svg viewBox="-1 -1 46 28" className="h-7 w-full" aria-hidden>
              <path
                d={signOutlinePath(shape, 44, 26)}
                className={cx(
                  'transition',
                  shape === value
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

const EDGES: EdgeProfile[] = ['square', 'chamfer', 'roundover'];

export function EdgeChoice({
  value,
  onChange,
}: {
  value: EdgeProfile;
  onChange: (edge: EdgeProfile) => void;
}) {
  const t = useTranslations('designer');
  return (
    <Group label={t('size.edge')}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('size.edge')}>
        {EDGES.map((edge) => (
          <Option
            key={edge}
            chosen={edge === value}
            onClick={() => onChange(edge)}
            label={t(`edges.${edge}`)}
          >
            {/* A section through the top corner of the board. */}
            <svg viewBox="0 0 44 22" className="h-7 w-full" aria-hidden>
              <path
                d={
                  edge === 'square'
                    ? 'M 2 6 H 42 V 20 H 2 Z'
                    : edge === 'chamfer'
                      ? 'M 2 6 H 36 L 42 12 V 20 H 2 Z'
                      : 'M 2 6 H 34 A 8 8 0 0 1 42 14 V 20 H 2 Z'
                }
                className={cx(
                  'transition',
                  edge === value
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
  const t = useTranslations('designer');
  return (
    <Group label={t('sections.wood')}>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('wood.label')}>
        {WOODS.map((wood) => (
          <Option
            key={wood.id}
            chosen={wood.id === value}
            onClick={() => onChange(wood.id)}
            label={wood.name[locale]}
          >
            {/* Banded, because a flat swatch of colour is not a timber. */}
            <span
              className={cx(
                'block h-7 w-full rounded-[3px] border transition',
                wood.id === value ? 'border-oak' : 'border-rule-strong group-hover:border-ink-3',
              )}
              style={{
                backgroundImage: `repeating-linear-gradient(94deg, ${wood.colour.light} 0 3px, ${wood.colour.base} 3px 7px, ${wood.colour.dark} 7px 9px, ${wood.colour.base} 9px 13px)`,
              }}
            />
          </Option>
        ))}
      </div>
    </Group>
  );
}

/* ── Border ───────────────────────────────────────────────────────────── */

const BORDERS: Border[] = ['none', 'line', 'double'];

export function BorderChoice({
  value,
  shape,
  onChange,
  canHold,
}: {
  value: Border;
  shape: SignShape;
  onChange: (border: Border) => void;
  canHold: (border: Border) => boolean;
}) {
  const t = useTranslations('designer');
  /*
    A board in miniature, at the proportions a real one has. The inset is drawn
    a little deeper than life — a real border sits about three per cent of the
    width in, which at this size is under a pixel and reads as nothing at all.
    Exaggerating it is what makes the three swatches tell each other apart,
    which is the only job they have.
  */
  const w = 44;
  const h = 26;
  const inset = 3.5;
  const gap = 2.2;

  return (
    <Group label={t('decor.border')}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('decor.border')}>
        {BORDERS.map((border) => (
          <Option
            key={border}
            chosen={border === value}
            disabled={!canHold(border)}
            blockedLabel={t('block.choiceBlocked')}
            onClick={() => onChange(border)}
            label={t(`borders.${border}`)}
          >
            <svg viewBox="-1 -1 46 28" className="h-7 w-full" aria-hidden>
              <path
                d={signOutlinePath(shape, w, h)}
                className={cx(
                  'transition',
                  border === value
                    ? 'fill-oak/25 stroke-oak'
                    : 'fill-surface-3 stroke-rule-strong group-hover:stroke-ink-3',
                )}
                strokeWidth={1.2}
              />
              {border !== 'none' && (
                <path
                  d={signOutlinePath(shape, w - inset * 2, h - inset * 2)}
                  transform={`translate(${inset} ${inset})`}
                  fill="none"
                  className={border === value ? 'stroke-oak' : 'stroke-ink-3'}
                  strokeWidth={1}
                />
              )}
              {border === 'double' && (
                <path
                  d={signOutlinePath(shape, w - (inset + gap) * 2, h - (inset + gap) * 2)}
                  transform={`translate(${inset + gap} ${inset + gap})`}
                  fill="none"
                  className={border === value ? 'stroke-oak' : 'stroke-ink-3'}
                  strokeWidth={0.6}
                />
              )}
            </svg>
          </Option>
        ))}
      </div>
    </Group>
  );
}

/* ── How it is cut, finished and hung ─────────────────────────────────── */

const METHODS: CarveMethod[] = ['vcarve', 'pocket', 'raised'];

export function CutChoice({
  value,
  onChange,
}: {
  value: CarveMethod;
  onChange: (method: CarveMethod) => void;
}) {
  const t = useTranslations('designer');
  return (
    <Group label={t('carve.method')}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('carve.method')}>
        {METHODS.map((method) => (
          <Option
            key={method}
            chosen={method === value}
            onClick={() => onChange(method)}
            label={t(`carve.methods.${method}`)}
          >
            {/* A section through the groove each one leaves. */}
            <svg viewBox="0 0 44 20" className="h-7 w-full" aria-hidden>
              <path
                d={
                  method === 'vcarve'
                    ? 'M 2 5 H 15 L 22 16 L 29 5 H 42'
                    : method === 'pocket'
                      ? 'M 2 5 H 15 V 15 H 29 V 5 H 42'
                      : 'M 2 15 H 15 V 5 H 29 V 15 H 42'
                }
                fill="none"
                className={cx(
                  'transition',
                  method === value ? 'stroke-oak' : 'stroke-rule-strong group-hover:stroke-ink-3',
                )}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </Option>
        ))}
      </div>
    </Group>
  );
}

const FINISHES: Finish[] = ['raw', 'oil', 'paint', 'oilPaint'];

export function FinishChoice({
  value,
  onChange,
}: {
  value: Finish;
  onChange: (finish: Finish) => void;
}) {
  const t = useTranslations('designer');
  return (
    <Group label={t('carve.finish')}>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('carve.finish')}>
        {FINISHES.map((finish) => (
          <Option
            key={finish}
            chosen={finish === value}
            onClick={() => onChange(finish)}
            label={t(`carve.finishes.${finish}`)}
            className="flex-row items-center justify-start gap-2 px-3 text-left"
          />
        ))}
      </div>
    </Group>
  );
}

const HANGINGS: Hanging[] = ['none', 'keyhole', 'rope', 'posts'];

export function HangingChoice({
  value,
  onChange,
}: {
  value: Hanging;
  onChange: (hanging: Hanging) => void;
}) {
  const t = useTranslations('designer');
  return (
    <Group label={t('carve.hanging')}>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('carve.hanging')}>
        {HANGINGS.map((hanging) => (
          <Option
            key={hanging}
            chosen={hanging === value}
            onClick={() => onChange(hanging)}
            label={t(`carve.hangings.${hanging}`)}
          />
        ))}
      </div>
    </Group>
  );
}
