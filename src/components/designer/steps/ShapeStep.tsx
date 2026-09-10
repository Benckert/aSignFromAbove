'use client';

import { useTranslations } from 'next-intl';
import { MACHINE } from '@/config/router-profile';
import { SIZE_PRESETS } from '@/lib/designer/defaults';
import { useDesigner } from '@/lib/designer/store';
import type { EdgeProfile, SignShape } from '@/lib/designer/types';
import { Field } from '@/components/ui/Field';
import { Segmented, Slider } from '@/components/ui/Controls';
import { cx } from '@/lib/cx';

/** The board: how big, what shape, what edge. */
export function ShapeStep() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);

  return (
    <div className="flex flex-col gap-5">
      <Field label={t('size.presets')}>
        {() => (
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
                    'rounded-sm border px-3 py-2 font-mono text-[0.75rem] transition',
                    active
                      ? 'border-ink bg-ink text-surface'
                      : 'border-rule text-ink-2 hover:border-rule-strong hover:text-ink',
                  )}
                >
                  {preset.widthMm}×{preset.heightMm}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field label={t('size.width')} readout={`${design.widthMm} mm`}>
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
    </div>
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
