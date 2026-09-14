'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Redo2, Undo2, RotateCcw } from 'lucide-react';
import { CARVING_FONTS } from '@/config/carving-fonts';
import { WOODS, getWood } from '@/config/woods';
import { priceSign, formatOre } from '@/lib/designer/pricing';
import type { CarveMethod, Finish, SignShape } from '@/lib/designer/types';
import { patchBlock, useSign } from '@/lib/sign/store';
import { toSignDesign } from '@/lib/sign/draft';
import { Field, inputClass } from '@/components/ui/Field';
import { Segmented, Slider, SwatchGrid } from '@/components/ui/Controls';
import { IconButton } from '@/components/ui/IconButton';
import { Board } from './Board';
import { capLimits, useOutline } from './useOutline';
import { cx } from '@/lib/cx';

/**
 * The rebuilt designer, first pass.
 *
 * Two things are different from the tool it is meant to replace, and everything
 * else here is deliberately absent so that those two can be judged on their own.
 *
 * The lettering is a real glyph outline, measured rather than estimated, so the
 * board shows the shape the router will cut and every dimension on screen is a
 * dimension on the wood.
 *
 * And you move it by moving it. The old designer put a nine-point grid and two
 * per-cent sliders in a side panel and asked people to think in coordinates; the
 * position controls here are the sign itself.
 *
 * There is no wrap, no border, no artwork, no second line of text and no preset.
 * Those come back one at a time, once this much is right.
 */
export function SignDesigner() {
  const locale = useLocale();
  const draft = useSign((s) => s.draft);
  const commit = useSign((s) => s.commit);
  const undo = useSign((s) => s.undo);
  const redo = useSign((s) => s.redo);
  const reset = useSign((s) => s.reset);
  const canUndo = useSign((s) => s.past.length > 0);
  const canRedo = useSign((s) => s.future.length > 0);

  const outline = useOutline(draft);
  const limits = capLimits(draft, outline);
  const price = useMemo(() => priceSign(toSignDesign(draft)), [draft]);
  const wood = getWood(draft.woodId);

  // Undo belongs to the page, not to the board: a change made in the panel has
  // to be undoable from wherever the focus happens to be.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      // Leave the browser's own undo alone while someone is typing.
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const block = draft.block;
  const size = Math.min(Math.max(block.capHeightMm, limits.min), limits.max);

  return (
    <div className="lg:flex lg:items-start">
      <section
        className={cx(
          'sticky top-16 z-30 flex flex-col border-b border-rule bg-surface-2 px-4 pb-3 pt-3',
          'lg:top-16 lg:h-[calc(100dvh-4rem)] lg:min-w-0 lg:flex-1 lg:self-start',
          'lg:border-b-0 lg:border-r lg:p-6 xl:p-8',
        )}
      >
        <div className="relative lg:min-h-0 lg:flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(90% 70% at 50% 40%, color-mix(in oklab, var(--color-oak) 13%, transparent) 0%, transparent 65%)',
            }}
          />
          <Board
            label={`Skylt ${draft.widthMm} × ${draft.heightMm} mm`}
            className="relative mx-auto h-[30vh] w-full sm:h-[36vh] lg:h-full"
          />
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          <span className="spec truncate">
            {draft.widthMm} × {draft.heightMm} mm · {wood.name[locale === 'en' ? 'en' : 'sv']}
            {' · '}
            {size} mm text
          </span>
          <span className="flex shrink-0 gap-0.5">
            <IconButton label="Ångra" onClick={undo} disabled={!canUndo}>
              <Undo2 size={15} aria-hidden />
            </IconButton>
            <IconButton label="Gör om" onClick={redo} disabled={!canRedo}>
              <Redo2 size={15} aria-hidden />
            </IconButton>
            <IconButton label="Börja om" onClick={reset}>
              <RotateCcw size={15} aria-hidden />
            </IconButton>
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-5 px-4 pb-24 pt-5 lg:w-[26rem] lg:shrink-0 lg:px-6 xl:w-[29rem]">
        <p className="rounded-md border border-rule bg-surface-2 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink-2">
          Dra texten dit du vill ha den. Hörnet ändrar storleken.
          {/* Only where there is a keyboard to hold it down with. */}
          <span className="hidden [@media(hover:hover)]:inline">
            {' '}
            Håll <kbd className="rounded-xs border border-rule px-1 font-mono text-[0.75rem]">Alt</kbd>{' '}
            för att komma förbi stödlinjerna.
          </span>
        </p>

        <Field label="Text">
          {(props) => (
            <textarea
              {...props}
              value={block.text}
              onChange={(e) => commit(patchBlock({ text: e.target.value }))}
              rows={2}
              maxLength={120}
              className={cx(inputClass, 'resize-y text-[1.0625rem] leading-snug')}
            />
          )}
        </Field>

        <Field label="Stil">
          {() => (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stil">
              {CARVING_FONTS.map((face) => {
                const chosen = face.id === block.fontId;
                return (
                  <button
                    key={face.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => commit(patchBlock({ fontId: face.id }))}
                    className={cx(
                      'rounded-sm border px-3 py-1.5 text-[1.0625rem] leading-tight transition',
                      chosen
                        ? 'border-ink bg-surface text-ink'
                        : 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink',
                    )}
                    style={{ fontFamily: face.cssFamily }}
                  >
                    {face.capsOnly ? face.label.toUpperCase() : face.label}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Textstorlek" readout={`${size} mm`}>
          {(props) => (
            <Slider
              {...props}
              value={size}
              min={limits.min}
              max={limits.max}
              step={1}
              onChange={(capHeightMm) => commit(patchBlock({ capHeightMm }))}
            />
          )}
        </Field>

        <Field label="Teckenavstånd" readout={`${Math.round(block.trackingEm * 100)} %`}>
          {(props) => (
            <Slider
              {...props}
              value={block.trackingEm}
              min={-0.05}
              max={0.4}
              step={0.01}
              onChange={(trackingEm) => commit(patchBlock({ trackingEm }))}
            />
          )}
        </Field>

        {block.text.includes('\n') && (
          <Field label="Justering">
            {() => (
              <Segmented
                label="Justering"
                value={block.align}
                options={[
                  { value: 'left', label: 'Vänster' },
                  { value: 'center', label: 'Centrerad' },
                  { value: 'right', label: 'Höger' },
                ]}
                onChange={(align) => commit(patchBlock({ align }))}
              />
            )}
          </Field>
        )}

        <hr className="border-rule" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Bredd" readout={`${draft.widthMm} mm`}>
            {(props) => (
              <Slider
                {...props}
                value={draft.widthMm}
                min={150}
                max={1200}
                step={10}
                onChange={(widthMm) => commit((d) => ({ ...d, widthMm }))}
              />
            )}
          </Field>
          <Field label="Höjd" readout={`${draft.heightMm} mm`}>
            {(props) => (
              <Slider
                {...props}
                value={draft.heightMm}
                min={80}
                max={800}
                step={10}
                onChange={(heightMm) => commit((d) => ({ ...d, heightMm }))}
              />
            )}
          </Field>
        </div>

        <Field label="Form">
          {() => (
            <Segmented<SignShape>
              label="Form"
              value={draft.shape}
              wrap
              options={[
                { value: 'rect', label: 'Rak' },
                { value: 'rounded', label: 'Rundad' },
                { value: 'arch', label: 'Välvd' },
                { value: 'oval', label: 'Oval' },
              ]}
              onChange={(shape) => commit((d) => ({ ...d, shape }))}
            />
          )}
        </Field>

        <Field label="Träslag">
          {() => (
            <SwatchGrid
              label="Träslag"
              value={draft.woodId}
              columns={4}
              options={WOODS.map((w) => ({
                value: w.id,
                label: w.name[locale === 'en' ? 'en' : 'sv'],
                colour: w.colour.base,
              }))}
              onChange={(woodId) => commit((d) => ({ ...d, woodId: woodId as typeof d.woodId }))}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Fräsning">
            {() => (
              <Segmented<CarveMethod>
                label="Fräsning"
                value={draft.method}
                wrap
                options={[
                  { value: 'vcarve', label: 'Skuren' },
                  { value: 'pocket', label: 'Urgröpt' },
                  { value: 'raised', label: 'Upphöjd' },
                ]}
                onChange={(method) => commit((d) => ({ ...d, method }))}
              />
            )}
          </Field>
          <Field label="Yta">
            {() => (
              <Segmented<Finish>
                label="Yta"
                value={draft.finish}
                wrap
                options={[
                  { value: 'raw', label: 'Obehandlad' },
                  { value: 'oil', label: 'Olja' },
                  { value: 'paint', label: 'Färg' },
                  { value: 'oilPaint', label: 'Färg och olja' },
                ]}
                onChange={(finish) => commit((d) => ({ ...d, finish }))}
              />
            )}
          </Field>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3 rounded-md border border-rule-strong bg-surface-2 p-4">
          <span className="label">Att betala</span>
          <span className="text-right">
            <span className="display block text-[1.75rem] leading-none text-ink">
              {formatOre(price.totalOre, locale)}
            </span>
            <span className="spec mt-1 block">inkl. moms</span>
          </span>
        </div>
      </section>
    </div>
  );
}
