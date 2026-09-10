'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X } from 'lucide-react';
import { useDesigner } from '@/lib/designer/store';
import { sanitizeArtwork, MAX_ARTWORK_BYTES } from '@/lib/designer/artwork';
import { SHOP } from '@/config/router-profile';
import { Field } from '@/components/ui/Field';
import { Section, Slider } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { formatOre } from '@/lib/designer/pricing';
import { useLocale } from 'next-intl';

export function ArtworkPanel() {
  const t = useTranslations('designer.artwork');
  const locale = useLocale();
  const artwork = useDesigner((s) => s.design.artwork);
  const setArtwork = useDesigner((s) => s.setArtwork);
  const input = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const artworkFee = Math.round((SHOP.artworkSetupMinutes / 60) * SHOP.hourlyRateOre * 1.25);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (file.size > MAX_ARTWORK_BYTES) {
      setError(t('errors.tooLarge'));
      return;
    }

    const text = await file.text();
    const result = sanitizeArtwork(text, file.name);
    if (!result.ok) {
      setError(t(`errors.${camel(result.reason)}`));
      return;
    }
    setArtwork(result.artwork);
  }

  return (
    <Section title={t('title')}>
      <p className="text-[0.8125rem] leading-relaxed text-ink-2">{t('lede')}</p>

      <input
        ref={input}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          // Allow re-picking the same file after removing it.
          e.target.value = '';
        }}
      />

      {!artwork ? (
        <Button variant="secondary" onClick={() => input.current?.click()}>
          <Upload size={15} aria-hidden /> {t('upload')}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-md border border-rule bg-surface-2 p-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-rule bg-surface text-ink"
              aria-hidden="true"
              // Already sanitised on the way in; re-checked again on the server.
              dangerouslySetInnerHTML={{ __html: scaleToBox(artwork.svg) }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-ink">
                {artwork.fileName}
              </span>
              <span className="spec">{t('adds', { amount: formatOre(artworkFee, locale) })}</span>
            </span>
            <button
              type="button"
              onClick={() => setArtwork(null)}
              className="shrink-0 rounded-xs p-2 text-ink-3 transition hover:bg-rust-wash hover:text-rust"
            >
              <span className="sr-only">{t('remove')}</span>
              <X size={16} aria-hidden />
            </button>
          </div>

          <Field label={t('width')} readout={`${Math.round(artwork.widthMm)} mm`}>
            {(props) => (
              <Slider
                {...props}
                value={artwork.widthMm}
                min={10}
                max={400}
                step={2}
                onChange={(widthMm) => setArtwork({ ...artwork, widthMm })}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('positionX')} readout={`${Math.round(artwork.x * 100)} %`}>
              {(props) => (
                <Slider
                  {...props}
                  value={artwork.x}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(x) => setArtwork({ ...artwork, x })}
                />
              )}
            </Field>
            <Field label={t('positionY')} readout={`${Math.round(artwork.y * 100)} %`}>
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

          <Field label={t('rotation')} readout={`${Math.round(artwork.rotation)}°`}>
            {(props) => (
              <Slider
                {...props}
                value={artwork.rotation}
                min={-180}
                max={180}
                step={1}
                onChange={(rotation) => setArtwork({ ...artwork, rotation })}
              />
            )}
          </Field>

          <Button variant="quiet" size="sm" onClick={() => input.current?.click()}>
            {t('replace')}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-rust-wash px-3.5 py-2.5 text-[0.8125rem] text-rust">
          {error}
        </p>
      )}
    </Section>
  );
}

function camel(reason: string): string {
  return reason.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Fits the thumbnail into its box regardless of the source viewBox. */
function scaleToBox(svg: string): string {
  return svg.replace('<svg', '<svg width="100%" height="100%"');
}
