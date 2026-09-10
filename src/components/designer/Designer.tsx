'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import { useDesigner, hasSavedDesign } from '@/lib/designer/store';
import { priceSign, formatOre } from '@/lib/designer/pricing';
import { validateDesign, hasBlockingWarning } from '@/lib/designer/validation';
import { PRESETS } from '@/lib/designer/defaults';
import { getWood } from '@/config/woods';
import { exportSvg, svgToPng, downloadFile } from '@/lib/designer/export';
import { SignPreview } from './SignPreview';
import { PriceCard } from './PriceCard';
import { WarningList } from './WarningList';
import { SizePanel } from './panels/SizePanel';
import { WoodPanel } from './panels/WoodPanel';
import { TextPanel } from './panels/TextPanel';
import { CarvePanel } from './panels/CarvePanel';
import { DecorPanel } from './panels/DecorPanel';
import { ArtworkPanel } from './panels/ArtworkPanel';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

/**
 * The designer.
 *
 * Layout is the whole game here. On a wide screen the preview stays put on the
 * left while the controls scroll on the right, so the drawing never leaves
 * sight. On a phone that split is impossible, so the preview pins itself under
 * the header at a reduced height and the price and the way forward live in a
 * bar along the bottom — always reachable with a thumb, never covering what is
 * being edited.
 */
export function Designer() {
  const t = useTranslations('designer');
  const locale = useLocale();

  const design = useDesigner((s) => s.design);
  const activeTextId = useDesigner((s) => s.activeTextId);
  const overflows = useDesigner((s) => s.overflows);
  const setOverflows = useDesigner((s) => s.setOverflows);
  const applyPreset = useDesigner((s) => s.applyPreset);
  const reset = useDesigner((s) => s.reset);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [downloadError, setDownloadError] = useState(false);

  // The store starts at the default design on both server and client; the saved
  // one is pulled in here, after mount, so the two first renders agree. If
  // something was actually restored, the customer is told — silently swapping
  // their screen for an older design would be worse than not restoring at all.
  const [restoredNotice, setRestoredNotice] = useState(false);

  /*
    Whether anything was actually saved has to be read during this first render,
    not inside the effect below. The preview's layout effect runs before the
    parent's effects and reports its overflow measurement into the store, which
    persists it — so by the time an effect here ran, storage would always look
    occupied and every first-time visitor would be told their work was restored.
  */
  const hadSavedDesign = useRef<boolean | null>(null);
  if (hadSavedDesign.current === null) {
    hadSavedDesign.current = typeof window !== 'undefined' && hasSavedDesign();
  }

  useEffect(() => {
    void useDesigner.persist.rehydrate();
    if (hadSavedDesign.current) setRestoredNotice(true);
  }, []);

  const price = useMemo(() => priceSign(design), [design]);
  const warnings = useMemo(
    () => validateDesign(design, { overflows }),
    [design, overflows],
  );
  const blocked = hasBlockingWarning(warnings);
  const wood = getWood(design.woodId);

  const handleOverflow = useCallback((value: boolean) => setOverflows(value), [setOverflows]);

  async function download(kind: 'png' | 'svg') {
    if (!svgRef.current) return;
    setDownloading(kind);
    setDownloadError(false);
    try {
      const { svg } = await exportSvg(svgRef.current);
      const stem = `skylt-${design.widthMm}x${design.heightMm}-${design.woodId}`;
      if (kind === 'svg') {
        downloadFile(svg, `${stem}.svg`, 'image/svg+xml');
      } else {
        const png = await svgToPng(svg);
        const blob = await (await fetch(png)).blob();
        downloadFile(blob, `${stem}.png`, 'image/png');
      }
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(null);
    }
  }

  const previewLabel = t('preview.aria', {
    wood: wood.name[locale === 'en' ? 'en' : 'sv'],
    width: design.widthMm,
    height: design.heightMm,
  });

  return (
    <div className="shell py-6 lg:py-10">
      <header className="mb-6 max-w-2xl lg:mb-8">
        <h1 className="display text-[clamp(1.9rem,4vw,2.75rem)]">{t('title')}</h1>
        <p className="prose-workshop mt-3 text-[0.9375rem]">{t('lede')}</p>
      </header>

      {restoredNotice && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-oak-wash px-4 py-3"
        >
          <p className="text-[0.8125rem] text-ink-2">{t('restored')}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              reset();
              setRestoredNotice(false);
            }}
          >
            {t('restoredAction')}
          </Button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_27rem]">
        {/* ── Preview ───────────────────────────────────────────────────── */}
        <div
          className={cx(
            // Pinned under the 4rem header on small screens, and again on large
            // ones once there is room for it to sit beside the controls.
            'sticky top-16 z-30 -mx-5 bg-surface/95 px-5 pb-3 pt-3 backdrop-blur-sm',
            'md:-mx-8 md:px-8 lg:top-24 lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none',
          )}
        >
          <div className="rounded-md border border-rule bg-surface-2 p-3 shadow-sheet sm:p-6 lg:p-8">
            <SignPreview
              design={design}
              activeTextId={activeTextId}
              onOverflowChange={handleOverflow}
              svgRef={svgRef}
              label={previewLabel}
              className="mx-auto h-[26vh] w-full max-w-full sm:h-[34vh] lg:h-auto lg:max-h-[54vh]"
            />
          </div>

          <div className="mt-2.5 hidden items-center justify-between gap-3 lg:flex">
            <span className="spec">
              {design.widthMm} × {design.heightMm} × {design.thicknessMm} mm ·{' '}
              {wood.name[locale === 'en' ? 'en' : 'sv']}
            </span>
            <span className="flex gap-1">
              <Button
                size="sm"
                variant="quiet"
                onClick={() => download('png')}
                disabled={downloading !== null}
              >
                {downloading === 'png' ? (
                  <Loader2 size={14} aria-hidden className="animate-spin" />
                ) : (
                  <Download size={14} aria-hidden />
                )}
                {t('preview.download')}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => download('svg')}
                disabled={downloading !== null}
              >
                SVG
              </Button>
            </span>
          </div>

          {downloadError && (
            <p role="alert" className="mt-2 hidden text-[0.75rem] text-rust lg:block">
              {t('preview.downloadFailed')}
            </p>
          )}
        </div>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="pb-28 lg:pb-0">
          {/* Starting points */}
          <section className="border-b border-rule pb-5">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="spec">{t('presets.title')}</h2>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  if (window.confirm(t('resetConfirm'))) reset();
                }}
              >
                <RotateCcw size={13} aria-hidden /> {t('reset')}
              </Button>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.blurb[locale === 'en' ? 'en' : 'sv']}
                  className="shrink-0 rounded-sm border border-rule px-3 py-2 text-[0.8125rem] text-ink-2 transition hover:border-ink hover:bg-surface-2 hover:text-ink"
                >
                  {preset.name[locale === 'en' ? 'en' : 'sv']}
                </button>
              ))}
            </div>
          </section>

          <SizePanel />
          <WoodPanel />
          <TextPanel />
          <CarvePanel />
          <DecorPanel />
          <ArtworkPanel />

          {/* ── Price and the way forward ───────────────────────────────── */}
          <section className="border-t border-rule py-5">
            <h3 className="mb-3 text-[0.9375rem] font-semibold text-ink">
              {t('sections.price')}
            </h3>

            <div className="flex flex-col gap-3">
              <PriceCard price={price} />

              <div>
                <h4 className="spec mb-2">{t('warnings.title')}</h4>
                <WarningList warnings={warnings} />
              </div>

              <div className="hidden lg:block">
                <OrderButton blocked={blocked} />
                <p className="mt-2 text-[0.75rem] text-ink-3">{t('order.reassure')}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Phone: price and CTA always within reach ───────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-sm lg:hidden">
        <div className="shell flex items-center gap-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="spec block">{t('mobile.priceLabel')}</span>
            <span className="display block truncate text-[1.25rem] leading-tight">
              {formatOre(price.totalOre, locale)}
            </span>
          </span>
          <OrderButton blocked={blocked} compact />
        </div>
      </div>
    </div>
  );
}

function OrderButton({ blocked, compact }: { blocked: boolean; compact?: boolean }) {
  const t = useTranslations('designer.order');

  if (blocked) {
    return (
      <span
        className={cx(
          'inline-flex items-center justify-center rounded-sm border border-rule px-4 text-center',
          'text-[0.8125rem] text-ink-3',
          compact ? 'h-11 max-w-[11rem]' : 'h-12 w-full',
        )}
      >
        {t('ctaBlocked')}
      </span>
    );
  }

  return (
    <ButtonLink
      href="/designer/order"
      variant="primary"
      size={compact ? 'md' : 'lg'}
      className={cx(compact ? 'h-11 shrink-0' : 'w-full')}
    >
      {t('cta')} <ArrowRight size={16} aria-hidden />
    </ButtonLink>
  );
}
