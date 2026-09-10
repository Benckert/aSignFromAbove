'use client';

import { useTranslations } from 'next-intl';
import { useDesigner } from '@/lib/designer/store';
import type { BorderStyle, CornerStyle } from '@/lib/designer/types';
import { Field } from '@/components/ui/Field';
import { Section, Segmented, Slider } from '@/components/ui/Controls';

export function DecorPanel() {
  const t = useTranslations('designer');
  const design = useDesigner((s) => s.design);
  const setDecoration = useDesigner((s) => s.setDecoration);
  const { decoration } = design;

  // The border cannot be inset further than half the shorter side.
  const maxInset = Math.floor(Math.min(design.widthMm, design.heightMm) / 2) - 5;

  return (
    <Section title={t('sections.decor')}>
      <Field label={t('decor.border')}>
        {() => (
          <Segmented<BorderStyle>
            label={t('decor.border')}
            value={decoration.border}
            wrap
            options={(['none', 'line', 'double', 'inset', 'notch'] as const).map((border) => ({
              value: border,
              label: t(`decor.borders.${border}`),
            }))}
            onChange={(border) => setDecoration({ border })}
          />
        )}
      </Field>

      {decoration.border !== 'none' && (
        <Field label={t('decor.inset')} readout={`${decoration.insetMm} mm`}>
          {(props) => (
            <Slider
              {...props}
              value={Math.min(decoration.insetMm, Math.max(maxInset, 4))}
              min={4}
              max={Math.max(maxInset, 5)}
              step={1}
              onChange={(insetMm) => setDecoration({ insetMm })}
            />
          )}
        </Field>
      )}

      <Field label={t('decor.corners')}>
        {() => (
          <Segmented<CornerStyle>
            label={t('decor.corners')}
            value={decoration.corners}
            wrap
            options={(['none', 'diamond', 'leaf', 'drilled'] as const).map((corners) => ({
              value: corners,
              label: t(`decor.cornerStyles.${corners}`),
            }))}
            onChange={(corners) => setDecoration({ corners })}
          />
        )}
      </Field>
    </Section>
  );
}
