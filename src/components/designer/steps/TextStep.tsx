'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { getFont } from '@/config/carving-fonts';
import { useDesigner } from '@/lib/designer/store';
import { availableFonts, capHeightRange } from '@/lib/designer/constraints';
import type { TextAlign, TextBlock, TextWrap } from '@/lib/designer/types';
import { toLines } from '@/lib/designer/geometry';
import { measureBlockWidthMm, measureCapRatios } from '@/lib/designer/measure';
import { Field, inputClass } from '@/components/ui/Field';
import { Segmented, Slider } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { PlacementGrid } from '@/components/ui/PlacementGrid';
import { cx } from '@/lib/cx';

/**
 * Everything about the wording, in one place.
 *
 * Lines are edited in place rather than behind an accordion: with two or three
 * of them, a collapsed list is one more click for no gain. The size slider's
 * ends are computed from the chosen face, the cutting method and the board, so
 * every position on it produces a sign that can actually be made.
 */
export function TextStep() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const addText = useDesigner((s) => s.addText);

  return (
    <div className="flex flex-col gap-5">
      {design.texts.map((block, i) => (
        <TextBlockCard key={block.id} block={block} index={i} />
      ))}

      {design.texts.length < 4 && (
        <Button variant="secondary" onClick={addText} className="self-start">
          <Plus size={15} aria-hidden /> {t('text.add')}
        </Button>
      )}
    </div>
  );
}

function TextBlockCard({ block, index }: { block: TextBlock; index: number }) {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const updateText = useDesigner((s) => s.updateText);
  const removeText = useDesigner((s) => s.removeText);
  const restoreText = useDesigner((s) => s.restoreText);
  const setActiveText = useDesigner((s) => s.setActiveText);
  const [undoable, setUndoable] = useState<{ block: TextBlock; index: number } | null>(null);

  const patch = (p: Partial<TextBlock>) => updateText(block.id, p);
  const font = getFont(block.fontId);
  const fonts = availableFonts(design.method);

  /*
    Measuring the laid-out glyphs is what lets the size slider stop exactly
    where the text would run off the board, rather than guessing from a table.

    It has to happen after mount, never during render: the measurement needs a
    canvas and the real font files, so the server would compute one ceiling and
    the browser a different one, and React would report the slider's max as a
    hydration mismatch. Until the measurement lands, the range falls back to the
    height-only ceiling, which is always at least as generous.
  */
  const [widthAt100, setWidthAt100] = useState<number | undefined>(undefined);
  const measureKey = `${block.content}|${block.fontId}|${block.letterSpacing}`;

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const width = measureBlockWidthMm(
        toLines(block.content).filter(Boolean),
        getFont(block.fontId).cssFamily,
        100,
        block.letterSpacing,
        measureCapRatios(),
        block.fontId,
      );
      setWidthAt100(width > 0 ? width : undefined);
    };
    // Wait for the webfonts, or the first measurement is of a fallback face.
    if (document.fonts) void document.fonts.ready.then(measure);
    else measure();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureKey]);

  const range = capHeightRange(design, block, widthAt100);
  const size = Math.min(Math.max(block.capHeightMm, range.min), range.max);

  return (
    <div className="rounded-md border border-rule bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="label">{t('text.blockLabel', { n: index + 1 })}</span>
        {design.texts.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setUndoable({ block, index });
              removeText(block.id);
            }}
            className="rounded-sm p-1.5 text-ink-3 transition hover:bg-rust-wash hover:text-rust"
          >
            <span className="sr-only">{t('text.remove')}</span>
            <Trash2 size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <textarea
          value={block.content}
          onChange={(e) => patch({ content: e.target.value })}
          onFocus={() => setActiveText(block.id)}
          onBlur={() => setActiveText(null)}
          rows={2}
          placeholder={t('text.placeholder')}
          aria-label={t('text.content')}
          className={cx(inputClass, 'resize-y text-[1.0625rem] leading-snug')}
          style={{ fontFamily: font.cssFamily }}
          maxLength={200}
        />

        {/* Faces are shown set in themselves; only ones that suit the chosen
            cutting method are here, so there is nothing to warn about. */}
        <Field label={t('text.font')}>
          {() => (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('text.font')}>
              {fonts.map((f) => {
                const selected = f.id === block.fontId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => patch({ fontId: f.id })}
                    className={cx(
                      'rounded-sm border px-3 py-1.5 text-[1.0625rem] leading-tight transition',
                      selected
                        ? 'border-ink bg-surface text-ink'
                        : 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink',
                    )}
                    style={{ fontFamily: f.cssFamily }}
                  >
                    {f.capsOnly ? f.label.toUpperCase() : f.label}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label={t('text.capHeight')} readout={`${Math.round(size)} mm`}>
          {(props) => (
            <Slider
              {...props}
              value={size}
              min={range.min}
              max={range.max}
              step={1}
              onChange={(capHeightMm) => patch({ capHeightMm })}
            />
          )}
        </Field>

        <Field label={t('text.wrap')}>
          {() => (
            <Segmented<TextWrap>
              label={t('text.wrap')}
              value={block.wrap}
              wrap
              options={(['straight', 'arcUp', 'arcDown', 'circle'] as const).map((w) => ({
                value: w,
                label: t(`wraps.${w}`),
              }))}
              onChange={(w) => patch({ wrap: w })}
            />
          )}
        </Field>

        {(block.wrap === 'arcUp' || block.wrap === 'arcDown') && (
          <Field label={t('text.curvature')} readout={`${Math.round(block.curvature * 100)} %`}>
            {(props) => (
              <Slider
                {...props}
                value={block.curvature}
                min={0.05}
                max={1}
                step={0.01}
                onChange={(curvature) => patch({ curvature })}
              />
            )}
          </Field>
        )}

        {block.wrap === 'circle' && (
          <Field label={t('text.radius')} readout={`${Math.round(block.circleRadiusMm)} mm`}>
            {(props) => (
              <Slider
                {...props}
                value={block.circleRadiusMm}
                min={20}
                max={Math.max(design.widthMm, design.heightMm) / 2}
                step={2}
                onChange={(circleRadiusMm) => patch({ circleRadiusMm })}
              />
            )}
          </Field>
        )}

        {block.wrap === 'straight' && (
          <Field label={t('text.align')}>
            {() => (
              <Segmented<TextAlign>
                label={t('text.align')}
                value={block.align}
                options={(['left', 'center', 'right'] as const).map((a) => ({
                  value: a,
                  label: t(`aligns.${a}`),
                }))}
                onChange={(align) => patch({ align })}
              />
            )}
          </Field>
        )}

        <Field label={t('text.position')}>
          {() => (
            <div className="flex flex-col gap-3">
              <PlacementGrid
                label={t('text.position')}
                x={block.x}
                y={block.y}
                aspect={design.widthMm / design.heightMm}
                onChange={(position) => patch(position)}
              />

              {/* The sliders stay for the millimetre-level cases the nine
                  points cannot reach. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('text.positionX')} readout={`${Math.round(block.x * 100)} %`}>
                  {(props) => (
                    <Slider
                      {...props}
                      value={block.x}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(x) => patch({ x })}
                    />
                  )}
                </Field>
                <Field label={t('text.positionY')} readout={`${Math.round(block.y * 100)} %`}>
                  {(props) => (
                    <Slider
                      {...props}
                      value={block.y}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(y) => patch({ y })}
                    />
                  )}
                </Field>
              </div>
            </div>
          )}
        </Field>
      </div>

      {undoable && (
        <div
          role="status"
          className="mt-3 flex items-center justify-between gap-3 rounded-md border border-rule bg-surface-3 px-3.5 py-2.5"
        >
          <span className="text-[0.8125rem] text-ink-2">{t('text.removed')}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              restoreText(undoable.block, undoable.index);
              setUndoable(null);
            }}
          >
            {t('text.undo')}
          </Button>
        </div>
      )}
    </div>
  );
}
