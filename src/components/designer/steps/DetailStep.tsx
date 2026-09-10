'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X } from 'lucide-react';
import { useDesigner } from '@/lib/designer/store';
import { sanitizeArtwork, MAX_ARTWORK_BYTES } from '@/lib/designer/artwork';
import type { BorderStyle, CornerStyle, Hanging } from '@/lib/designer/types';
import { Field } from '@/components/ui/Field';
import { Segmented, Slider } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { Disclosure } from '@/components/ui/Disclosure';

/**
 * The optional extras: a border, a fixing, a piece of the customer's own
 * artwork. Last of the four steps because a sign is finished without any of
 * them, and putting them earlier makes the tool feel longer than it is.
 */
export function DetailStep() {
  const t = useTranslations('designer');
  const a = useTranslations('designer.artwork');
  const design = useDesigner((s) => s.design);
  const set = useDesigner((s) => s.set);
  const setDecoration = useDesigner((s) => s.setDecoration);
  const setArtwork = useDesigner((s) => s.setArtwork);

  const input = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { decoration, artwork } = design;
  const maxInset = Math.max(Math.floor(Math.min(design.widthMm, design.heightMm) / 2) - 5, 5);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_ARTWORK_BYTES) {
      setError(a('errors.tooLarge'));
      return;
    }
    const result = sanitizeArtwork(await file.text(), file.name);
    if (!result.ok) {
      setError(a(`errors.${result.reason.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`));
      return;
    }
    setArtwork(result.artwork);
  }

  return (
    <div className="flex flex-col gap-3">
      <Disclosure title={t('decor.section')} summary={t(`decor.borders.${decoration.border}`)} defaultOpen>
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
        <>
          <Field label={t('decor.inset')} readout={`${decoration.insetMm} mm`}>
            {(props) => (
              <Slider
                {...props}
                value={Math.min(decoration.insetMm, maxInset)}
                min={4}
                max={maxInset}
                step={1}
                onChange={(insetMm) => setDecoration({ insetMm })}
              />
            )}
          </Field>

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
        </>
      )}

      </Disclosure>

      <Disclosure title={t('carve.hanging')} summary={t(`carve.hangings.${design.hanging}`)}>
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

      </Disclosure>

      <Disclosure title={a('title')} summary={artwork ? artwork.fileName : a('none')}>
      <Field label={a('title')} hint={a('lede')}>
        {() => (
          <>
            <input
              ref={input}
              type="file"
              accept=".svg,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {!artwork ? (
              <Button variant="secondary" onClick={() => input.current?.click()} className="self-start">
                <Upload size={15} aria-hidden /> {a('upload')}
              </Button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-md border border-rule bg-surface-2 p-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-rule bg-surface text-ink"
                    aria-hidden="true"
                    // Sanitised on the way in, and re-checked on the server.
                    dangerouslySetInnerHTML={{
                      __html: artwork.svg.replace('<svg', '<svg width="100%" height="100%"'),
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
                    {artwork.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setArtwork(null)}
                    className="shrink-0 rounded-sm p-2 text-ink-3 transition hover:bg-rust-wash hover:text-rust"
                  >
                    <span className="sr-only">{a('remove')}</span>
                    <X size={16} aria-hidden />
                  </button>
                </div>

                <Field label={a('width')} readout={`${Math.round(artwork.widthMm)} mm`}>
                  {(props) => (
                    <Slider
                      {...props}
                      value={artwork.widthMm}
                      min={10}
                      max={Math.round(design.widthMm * 0.8)}
                      step={2}
                      onChange={(widthMm) => setArtwork({ ...artwork, widthMm })}
                    />
                  )}
                </Field>

                <Field label={a('positionY')} readout={`${Math.round(artwork.y * 100)} %`}>
                  {(props) => (
                    <Slider
                      {...props}
                      value={artwork.y}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(y) => setArtwork({ ...artwork, y })}
                    />
                  )}
                </Field>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-2 rounded-md bg-rust-wash px-3.5 py-2.5 text-[0.8125rem] text-rust">
                {error}
              </p>
            )}
          </>
        )}
      </Field>
      </Disclosure>
    </div>
  );
}
