'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, ChevronDown, MoveHorizontal } from 'lucide-react';
import { getFont } from '@/config/carving-fonts';
import { useDesigner } from '@/lib/designer/store';
import type { TextAlign, TextBlock, TextWrap } from '@/lib/designer/types';
import { toLines, safeArea } from '@/lib/designer/geometry';
import { capHeightToFit, measureCapRatios } from '@/lib/designer/measure';
import { Field, inputClass } from '@/components/ui/Field';
import { Section, Segmented, Slider } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { FontPicker } from '../FontPicker';
import { cx } from '@/lib/cx';

export function TextPanel() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const activeTextId = useDesigner((s) => s.activeTextId);
  const setActiveText = useDesigner((s) => s.setActiveText);
  const addText = useDesigner((s) => s.addText);
  const removeText = useDesigner((s) => s.removeText);
  const restoreText = useDesigner((s) => s.restoreText);

  // A removed line can be put straight back, so deleting is never a small
  // disaster that costs someone their wording.
  const [undoable, setUndoable] = useState<{ block: TextBlock; index: number } | null>(null);

  return (
    <Section
      title={t('sections.text')}
      aside={
        <Button size="sm" variant="quiet" onClick={addText}>
          <Plus size={14} aria-hidden /> {t('text.add')}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {design.texts.map((block, index) => {
          const open = activeTextId === block.id;
          const preview = toLines(block.content).join(' · ').trim();
          return (
            <div
              key={block.id}
              className={cx(
                'rounded-md border transition',
                open ? 'border-ink bg-surface' : 'border-rule bg-surface-2',
              )}
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveText(open ? null : block.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                >
                  <ChevronDown
                    size={15}
                    aria-hidden
                    className={cx('shrink-0 text-ink-3 transition', open && 'rotate-180')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="spec block">{t('text.blockLabel', { n: index + 1 })}</span>
                    <span
                      className="mt-0.5 block truncate text-[0.9375rem] text-ink"
                      style={{ fontFamily: getFont(block.fontId).cssFamily }}
                    >
                      {preview || (
                        <span className="font-sans italic text-ink-3">{t('text.empty')}</span>
                      )}
                    </span>
                  </span>
                  <span className="spec shrink-0">{Math.round(block.capHeightMm)} mm</span>
                </button>

                {design.texts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUndoable({ block, index });
                      removeText(block.id);
                    }}
                    className="px-3 text-ink-3 transition hover:bg-rust-wash hover:text-rust"
                  >
                    <span className="sr-only">{t('text.remove')}</span>
                    <Trash2 size={15} aria-hidden />
                  </button>
                )}
              </div>

              {open && <TextBlockEditor block={block} />}
            </div>
          );
        })}
      </div>

      {undoable && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-rule bg-surface-3 px-3.5 py-2.5"
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
    </Section>
  );
}

function TextBlockEditor({ block }: { block: TextBlock }) {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const method = design.method;
  const updateText = useDesigner((s) => s.updateText);
  const font = getFont(block.fontId);
  const patch = (p: Partial<TextBlock>) => updateText(block.id, p);

  const strokeMm = block.capHeightMm * font.strokeRatio;

  /**
   * Sets the cap height to the largest value that still fits the board.
   *
   * A long house name at a comfortable size will always run off the edge, and
   * hunting for the right millimetre on a slider is tedious. This does the
   * arithmetic and writes a real value into the field, so what goes to the
   * workshop is still an explicit measurement rather than "whatever fits".
   */
  function fitToWidth() {
    const area = safeArea(design.shape, design.widthMm, design.heightMm);
    const available = block.wrap === 'straight' ? area.width : area.width * 0.92;
    const fitted = capHeightToFit(
      toLines(block.content).filter(Boolean),
      font.cssFamily,
      available,
      block.letterSpacing,
      measureCapRatios(),
      block.fontId,
    );
    if (fitted) patch({ capHeightMm: Math.min(fitted, 220) });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-rule px-3 pb-4 pt-3.5">
      <Field label={t('text.content')} hint={t('text.contentHint')}>
        {(props) => (
          <textarea
            {...props}
            value={block.content}
            onChange={(e) => patch({ content: e.target.value })}
            rows={2}
            placeholder={t('text.placeholder')}
            className={cx(inputClass, 'resize-y leading-snug')}
            style={{ fontFamily: font.cssFamily }}
            maxLength={200}
          />
        )}
      </Field>

      <Field
        label={t('text.font')}
        hint={font.capsOnly ? t('text.capsOnly') : undefined}
      >
        {() => (
          <FontPicker
            label={t('text.font')}
            value={block.fontId}
            method={method}
            onChange={(fontId) => patch({ fontId })}
          />
        )}
      </Field>

      <Field
        label={t('text.capHeight')}
        readout={`${Math.round(block.capHeightMm)} mm`}
        hint={t('text.strokeWidth', { mm: strokeMm.toFixed(1) })}
      >
        {(props) => (
          <div className="flex items-center gap-2">
            <Slider
              {...props}
              value={block.capHeightMm}
              min={6}
              max={220}
              step={1}
              onChange={(capHeightMm) => patch({ capHeightMm })}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={fitToWidth}
              disabled={!block.content.trim()}
              className="shrink-0"
              title={t('text.fitToWidth')}
            >
              <MoveHorizontal size={13} aria-hidden />
              <span className="sr-only sm:not-sr-only">{t('text.fitToWidth')}</span>
            </Button>
          </div>
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
              max={400}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('text.letterSpacing')} readout={`${(block.letterSpacing * 100).toFixed(0)}`}>
          {(props) => (
            <Slider
              {...props}
              value={block.letterSpacing}
              min={-0.05}
              max={0.4}
              step={0.005}
              onChange={(letterSpacing) => patch({ letterSpacing })}
            />
          )}
        </Field>

        {toLines(block.content).length > 1 && (
          <Field label={t('text.lineHeight')} readout={block.lineHeight.toFixed(2)}>
            {(props) => (
              <Slider
                {...props}
                value={block.lineHeight}
                min={1}
                max={2.6}
                step={0.05}
                onChange={(lineHeight) => patch({ lineHeight })}
              />
            )}
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
  );
}
