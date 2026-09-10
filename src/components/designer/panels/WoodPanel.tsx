'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getWood, WOODS } from '@/config/woods';
import { useDesigner } from '@/lib/designer/store';
import type { WoodId } from '@/config/woods';
import { Section, SwatchGrid } from '@/components/ui/Controls';

export function WoodPanel() {
  const t = useTranslations('designer');
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);
  const wood = getWood(design.woodId);

  return (
    <Section title={t('sections.wood')}>
      <SwatchGrid
        label={t('wood.label')}
        value={design.woodId}
        columns={4}
        onChange={(id) => set({ woodId: id as WoodId })}
        options={WOODS.map((w) => ({
          value: w.id,
          label: w.name[locale],
          colour: w.colour.base,
          accent: w.grainStrength > 0.5 ? w.colour.dark : undefined,
        }))}
      />

      {/* The chosen species explains itself, rather than the customer having to
          guess what "ask" means for their sign. */}
      <div className="rounded-md border border-rule bg-surface-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-[0.9375rem] font-semibold text-ink">{wood.name[locale]}</h4>
          <span className="text-[0.75rem] italic text-ink-3">{wood.latin}</span>
        </div>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{wood.note[locale]}</p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-rule pt-3">
          <div className="flex gap-1.5">
            <dt className="spec">{t('wood.hardness')}</dt>
            <dd className="font-mono text-[0.6875rem] tracking-wide text-ink">
              {wood.hardness[locale].toUpperCase()}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="spec">{t('wood.pricePerDm2')}</dt>
            <dd className="font-mono text-[0.6875rem] tracking-wide text-ink">
              {(wood.pricePerDm2 / 100).toFixed(0)} KR/DM²
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="sr-only">{t('size.placement')}</dt>
            <dd className="font-mono text-[0.6875rem] tracking-wide text-ink-3">
              {(wood.outdoorSuitable ? t('wood.outdoor') : t('wood.indoorOnly')).toUpperCase()}
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}
