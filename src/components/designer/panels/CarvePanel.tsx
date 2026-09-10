'use client';

import { useTranslations } from 'next-intl';
import { useDesigner } from '@/lib/designer/store';
import type { CarveMethod, Finish, Hanging } from '@/lib/designer/types';
import { Field } from '@/components/ui/Field';
import { Section, Segmented } from '@/components/ui/Controls';
import { cx } from '@/lib/cx';

/** Paint colours a workshop would actually keep on the shelf. */
const PAINT_COLOURS = [
  { hex: '#1d1813', name: 'Svart / Black' },
  { hex: '#26312a', name: 'Mörkgrön / Dark green' },
  { hex: '#7a1f18', name: 'Falurött / Falu red' },
  { hex: '#1e3a52', name: 'Mörkblå / Dark blue' },
  { hex: '#f5f0e4', name: 'Bruten vit / Off-white' },
  { hex: '#a8862f', name: 'Guld / Gold' },
];

export function CarvePanel() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);
  const painted = design.finish === 'paint' || design.finish === 'oilPaint';

  return (
    <Section title={t('sections.carve')}>
      <Field label={t('carve.method')}>
        {() => (
          <Segmented<CarveMethod>
            label={t('carve.method')}
            value={design.method}
            options={(['vcarve', 'pocket', 'raised'] as const).map((method) => ({
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
            options={(['raw', 'oil', 'paint', 'oilPaint'] as const).map((finish) => ({
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
            <div role="radiogroup" aria-label={t('carve.paintColour')} className="flex flex-wrap gap-1.5">
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
                      'h-9 w-9 rounded-xs border-2 transition',
                      selected ? 'border-ink ring-1 ring-ink' : 'border-rule hover:border-rule-strong',
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

      <Field label={t('carve.hanging')}>
        {() => (
          <Segmented<Hanging>
            label={t('carve.hanging')}
            value={design.hanging}
            wrap
            options={(['none', 'keyhole', 'rope', 'posts'] as const).map((hanging) => ({
              value: hanging,
              label: t(`carve.hangings.${hanging}`),
            }))}
            onChange={(hanging) => set({ hanging })}
          />
        )}
      </Field>
    </Section>
  );
}
