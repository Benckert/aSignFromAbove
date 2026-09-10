'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import { useDesigner, hasSavedDesign } from '@/lib/designer/store';
import { priceSign, formatOre } from '@/lib/designer/pricing';
import { isOrderable } from '@/lib/designer/constraints';
import { PRESETS } from '@/lib/designer/defaults';
import { getWood } from '@/config/woods';
import { exportSvg, svgToPng, downloadFile } from '@/lib/designer/export';
import { SignPreview } from './SignPreview';
import { PriceCard } from './PriceCard';
import { TextStep } from './steps/TextStep';
import { ShapeStep } from './steps/ShapeStep';
import { MaterialStep } from './steps/MaterialStep';
import { DetailStep } from './steps/DetailStep';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

/**
 * The designer.
 *
 * Two decisions shape this screen.
 *
 * First, the controls are grouped into four steps rather than stacked in one
 * long column. Everything about the wording lives together, everything about
 * the board lives together. A customer looking to change the text never has to
 * scroll past a border-inset slider to find it.
 *
 * Second, there is no warnings panel. The store reconciles every edit against
 * what the machine and the timber can do, so an unbuildable sign cannot be
 * configured in the first place — options that would not work are not offered,
 * and sliders stop where the physics does.
 */

const STEPS = ['text', 'shape', 'material', 'detail'] as const;
type Step = (typeof STEPS)[number];

export function Designer() {
  const t = useTranslations('designer');
  const locale = useLocale();

  const design = useDesigner((s) => s.design);
  const applyPreset = useDesigner((s) => s.applyPreset);
  const reset = useDesigner((s) => s.reset);

  const [step, setStep] = useState<Step>('text');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);

  // Read before any effect writes to storage, so a first-time visitor is not
  // told their work was restored.
  const hadSaved = useRef<boolean | null>(null);
  if (hadSaved.current === null) {
    hadSaved.current = typeof window !== 'undefined' && hasSavedDesign();
  }
  useEffect(() => {
    void useDesigner.persist.rehydrate();
    if (hadSaved.current) setRestoredNotice(true);
  }, []);

  const price = useMemo(() => priceSign(design), [design]);
  const orderable = isOrderable(design);
  const wood = getWood(design.woodId);

  async function download() {
    if (!svgRef.current) return;
    setDownloading(true);
    try {
      const { svg } = await exportSvg(svgRef.current);
      const png = await svgToPng(svg, 1400);
      const blob = await (await fetch(png)).blob();
      downloadFile(blob, `skylt-${design.widthMm}x${design.heightMm}.png`, 'image/png');
    } catch {
      // A failed download is not worth an alarm; the drawing is still on screen.
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="shell py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[clamp(1.6rem,3.4vw,2.25rem)]">{t('title')}</h1>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-sm border border-rule px-3 py-1.5 text-[0.8125rem] text-ink-2 transition hover:border-ink hover:text-ink"
            >
              {preset.name[locale === 'en' ? 'en' : 'sv']}
            </button>
          ))}
        </div>
      </div>

      {restoredNotice && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface-2 px-4 py-2.5"
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
            'sticky top-16 z-30 -mx-5 bg-surface/95 px-5 pb-3 pt-3 backdrop-blur-sm',
            'md:-mx-8 md:px-8 lg:top-24 lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none',
          )}
        >
          <div className="rounded-lg border border-rule bg-surface-2 p-3 sm:p-6 lg:p-8">
            <SignPreview
              design={design}
              svgRef={svgRef}
              label={t('preview.aria', {
                wood: wood.name[locale === 'en' ? 'en' : 'sv'],
                width: design.widthMm,
                height: design.heightMm,
              })}
              className="mx-auto h-[24vh] w-full max-w-full sm:h-[32vh] lg:h-auto lg:max-h-[52vh]"
            />
          </div>

          <div className="mt-2.5 hidden items-center justify-between gap-3 lg:flex">
            <span className="spec">
              {design.widthMm} × {design.heightMm} mm · {wood.name[locale === 'en' ? 'en' : 'sv']}
            </span>
            <span className="flex gap-1">
              <Button size="sm" variant="quiet" onClick={download} disabled={downloading}>
                {downloading ? (
                  <Loader2 size={14} aria-hidden className="animate-spin" />
                ) : (
                  <Download size={14} aria-hidden />
                )}
                {t('preview.download')}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  if (window.confirm(t('resetConfirm'))) reset();
                }}
              >
                <RotateCcw size={13} aria-hidden /> {t('reset')}
              </Button>
            </span>
          </div>
        </div>

        {/* ── Controls, in four steps ───────────────────────────────────── */}
        <div className="pb-28 lg:pb-0">
          <div
            role="tablist"
            aria-label={t('title')}
            className="sticky top-[calc(4rem+var(--preview-h,0px))] z-20 -mx-5 mb-5 flex gap-1 overflow-x-auto border-b border-rule bg-surface px-5 pt-1 md:-mx-8 md:px-8 lg:static lg:mx-0 lg:px-0"
          >
            {STEPS.map((id) => {
              const selected = step === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setStep(id)}
                  className={cx(
                    'relative shrink-0 px-3 pb-2.5 pt-2 text-[0.875rem] transition',
                    selected ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  {t(`steps.${id}`)}
                  {selected && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-oak" />
                  )}
                </button>
              );
            })}
          </div>

          {step === 'text' && <TextStep />}
          {step === 'shape' && <ShapeStep />}
          {step === 'material' && <MaterialStep />}
          {step === 'detail' && <DetailStep />}

          <div className="mt-8 hidden flex-col gap-3 border-t border-rule pt-6 lg:flex">
            <PriceCard price={price} />
            <OrderButton orderable={orderable} />
          </div>
        </div>
      </div>

      {/* ── Phone: price and the way forward, always reachable ─────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-sm lg:hidden">
        <div className="shell flex items-center gap-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="spec block">{t('mobile.priceLabel')}</span>
            <span className="display block truncate text-[1.25rem] leading-tight">
              {formatOre(price.totalOre, locale)}
            </span>
          </span>
          <OrderButton orderable={orderable} compact />
        </div>
      </div>
    </div>
  );
}

function OrderButton({ orderable, compact }: { orderable: boolean; compact?: boolean }) {
  const t = useTranslations('designer.order');

  if (!orderable) {
    return (
      <span
        className={cx(
          'inline-flex items-center justify-center rounded-sm border border-rule px-4 text-center text-[0.8125rem] text-ink-3',
          compact ? 'h-11 max-w-[11rem]' : 'h-12 w-full',
        )}
      >
        {t('ctaEmpty')}
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
