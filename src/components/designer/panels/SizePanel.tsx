'use client';

import { useTranslations } from 'next-intl';
import { MACHINE } from '@/config/router-profile';
import { SIZE_PRESETS } from '@/lib/designer/defaults';
import { useDesigner } from '@/lib/designer/store';
import type { EdgeProfile, Placement, SignShape } from '@/lib/designer/types';
import { Field } from '@/components/ui/Field';
import { Segmented, Slider, Section } from '@/components/ui/Controls';
import { cx } from '@/lib/cx';

export function SizePanel() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);

  return (
    <Section title={t('sections.shape')}>
      {/* One tap for the common sizes, before anyone has to think in millimetres. */}
      <div>
        <span className="spec mb-2 block">{t('size.presets')}</span>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_PRESETS.map((preset) => {
            const active =
              design.widthMm === preset.widthMm && design.heightMm === preset.heightMm;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => set({ widthMm: preset.widthMm, heightMm: preset.heightMm })}
                aria-pressed={active}
                className={cx(
                  'rounded-sm border px-2.5 py-1.5 font-mono text-[0.6875rem] tracking-wide transition',
                  active
                    ? 'border-ink bg-ink text-surface'
                    : 'border-rule text-ink-2 hover:border-rule-strong hover:bg-surface-2',
                )}
              >
                {preset.widthMm}×{preset.heightMm}
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label={t('size.width')}
        readout={`${design.widthMm} mm`}
        hint={t('size.maxHint', {
          width: MACHINE.workAreaMm.width,
          height: MACHINE.workAreaMm.height,
        })}
      >
        {(props) => (
          <Slider
            {...props}
            value={design.widthMm}
            min={MACHINE.minSignMm.width}
            max={MACHINE.workAreaMm.width}
            step={10}
            onChange={(widthMm) => set({ widthMm })}
          />
        )}
      </Field>

      <Field label={t('size.height')} readout={`${design.heightMm} mm`}>
        {(props) => (
          <Slider
            {...props}
            value={design.heightMm}
            min={MACHINE.minSignMm.height}
            max={MACHINE.workAreaMm.height}
            step={10}
            onChange={(heightMm) => set({ heightMm })}
          />
        )}
      </Field>

      <Field label={t('size.thickness')}>
        {() => (
          <Segmented
            label={t('size.thickness')}
            value={String(design.thicknessMm)}
            options={MACHINE.thicknessesMm.map((mm) => ({
              value: String(mm),
              label: <span className="font-mono text-[0.75rem]">{mm} mm</span>,
            }))}
            onChange={(value) => set({ thicknessMm: Number(value) })}
          />
        )}
      </Field>

      <Field label={t('size.shape')}>
        {() => (
          <Segmented<SignShape>
            label={t('size.shape')}
            value={design.shape}
            options={(['rect', 'rounded', 'arch', 'oval'] as const).map((shape) => ({
              value: shape,
              label: <ShapeIcon shape={shape} />,
              title: t(`shapes.${shape}`),
            }))}
            onChange={(shape) => set({ shape })}
          />
        )}
      </Field>

      <Field label={t('size.edge')}>
        {() => (
          <Segmented<EdgeProfile>
            label={t('size.edge')}
            value={design.edge}
            options={(['square', 'chamfer', 'roundover'] as const).map((edge) => ({
              value: edge,
              label: t(`edges.${edge}`),
            }))}
            onChange={(edge) => set({ edge })}
          />
        )}
      </Field>

      <Field label={t('size.placement')}>
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
    </Section>
  );
}

/** A small drawing of each blank, which reads faster than the word for it. */
function ShapeIcon({ shape }: { shape: SignShape }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 };
  return (
    <svg viewBox="0 0 32 20" className="mx-auto h-5 w-8" aria-hidden="true">
      {shape === 'rect' && <rect x="2" y="3" width="28" height="14" {...common} />}
      {shape === 'rounded' && <rect x="2" y="3" width="28" height="14" rx="3.5" {...common} />}
      {shape === 'arch' && <path d="M2 17V8a14 8 0 0 1 28 0v9Z" {...common} />}
      {shape === 'oval' && <ellipse cx="16" cy="10" rx="14" ry="7" {...common} />}
    </svg>
  );
}
