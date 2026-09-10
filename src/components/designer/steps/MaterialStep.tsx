'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getWood } from '@/config/woods';
import { useDesigner } from '@/lib/designer/store';
import { availableFinishes, availableMethods, availableWoods } from '@/lib/designer/constraints';
import type { CarveMethod, Finish, Placement } from '@/lib/designer/types';
import type { WoodId } from '@/config/woods';
import { Field } from '@/components/ui/Field';
import { Segmented, SwatchGrid } from '@/components/ui/Controls';
import { cx } from '@/lib/cx';

/**
 * Timber, cut and finish.
 *
 * Where the sign will live comes first, because it decides everything below
 * it: choose outdoors and the timbers that will not survive simply leave the
 * list, along with raised lettering, which holds water. Nothing is greyed out
 * with an explanation — the choices on offer are the choices that work.
 */

const PAINT_COLOURS = [
  { hex: '#1d1813', name: 'Svart / Black' },
  { hex: '#26312a', name: 'Mörkgrön / Dark green' },
  { hex: '#7a1f18', name: 'Falurött / Falu red' },
  { hex: '#1e3a52', name: 'Mörkblå / Dark blue' },
  { hex: '#f5f0e4', name: 'Bruten vit / Off-white' },
  { hex: '#a8862f', name: 'Guld / Gold' },
];

export function MaterialStep() {
  const t = useTranslations('designer');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);

  const wood = getWood(design.woodId);
  const woods = availableWoods(design.placement);
  const methods = availableMethods(design.placement);
  const finishes = availableFinishes(design.placement);
  const painted = design.finish === 'paint' || design.finish === 'oilPaint';

  return (
    <div className="flex flex-col gap-5">
      <Field
        label={t('size.placement')}
        hint={design.placement !== 'indoor' ? t('wood.filtered') : undefined}
      >
        {() => (
          <Segmented<Placement>
            label={t('size.placement')}
            value={design.placement}
            options={(['indoor', 'sheltered', 'outdoor'] as const).map((placement) => ({
              value: placement,
              label: t(`placements.${placement}`),
            }))}
            onChange={(placement) => set({ placement })}
          />
        )}
      </Field>

      <Field label={t('wood.label')}>
        {() => (
          <SwatchGrid
            label={t('wood.label')}
            value={design.woodId}
            columns={4}
            onChange={(id) => set({ woodId: id as WoodId })}
            options={woods.map((w) => ({
              value: w.id,
              label: w.name[locale],
              colour: w.colour.base,
              accent: w.grainStrength > 0.5 ? w.colour.dark : undefined,
            }))}
          />
        )}
      </Field>

      <p className="-mt-2 text-[0.8125rem] leading-relaxed text-ink-3">{wood.note[locale]}</p>

      <Field label={t('carve.method')}>
        {() => (
          <Segmented<CarveMethod>
            label={t('carve.method')}
            value={design.method}
            options={methods.map((method) => ({
              value: method,
              label: t(`carve.methods.${method}`),
              detail: t(`carve.methods.${method}Detail`),
            }))}
            onChange={(method) => set({ method })}
          />
        )}
      </Field>

      <Field label={t('carve.finish')}>
        {() => (
          <Segmented<Finish>
            label={t('carve.finish')}
            value={design.finish}
            wrap
            options={finishes.map((finish) => ({
              value: finish,
              label: t(`carve.finishes.${finish}`),
            }))}
            onChange={(finish) => set({ finish })}
          />
        )}
      </Field>

      {painted && (
        <Field label={t('carve.paintColour')}>
          {() => (
            <div
              role="radiogroup"
              aria-label={t('carve.paintColour')}
              className="flex flex-wrap gap-1.5"
            >
              {PAINT_COLOURS.map((colour) => {
                const selected = design.paintColour === colour.hex;
                return (
                  <button
                    key={colour.hex}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={colour.name}
                    onClick={() => set({ paintColour: colour.hex })}
                    className={cx(
                      'h-9 w-9 rounded-sm border-2 transition',
                      selected
                        ? 'border-ink ring-1 ring-ink'
                        : 'border-rule hover:border-rule-strong',
                    )}
                    style={{ backgroundColor: colour.hex }}
                  >
                    <span className="sr-only">{colour.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}
    </div>
  );
}
