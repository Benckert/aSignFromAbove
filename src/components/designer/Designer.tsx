'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
 * Three decisions shape this screen.
 *
 * The controls are grouped into four steps rather than stacked in one long
 * column, so everything about the wording lives together and nobody scrolls
 * past a border-inset slider to reach the text field.
 *
 * There is no warnings panel. The store reconciles every edit against what the
 * machine and the timber can do, so an unbuildable sign cannot be configured.
 *
 * And the header stays put. The title, the examples and the step tabs are one
 * sticky block under the site header: on a tool people scroll inside for
 * several minutes, losing the tabs off the top means scrolling back up to
 * change subject.
 */

const STEPS = ['text', 'shape', 'material', 'detail'] as const;
type Step = (typeof STEPS)[number];

/** Height of the site header, which everything sticky here sits beneath. */
const HEADER = '4rem';

export function Designer() {
  const t = useTranslations('designer');
  const locale = useLocale();

  const design = useDesigner((s) => s.design);
  const applyPreset = useDesigner((s) => s.applyPreset);
  const reset = useDesigner((s) => s.reset);

  const [step, setStep] = useState<Step>('text');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  /*
    The preview pins directly beneath the title-and-tabs block, so it needs to
    know how tall that block actually is. That height is not a constant: the
    example chips wrap onto a second row on a narrow screen, and the title
    scales with the viewport. Measuring it and publishing the result as a
    custom property is what keeps the two stacked correctly at every width,
    rather than a magic number that is right at exactly one of them.
  */
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeaderHeight(entry.contentRect.height),
    );
    observer.observe(node);
    setHeaderHeight(node.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  // Read before any effect writes to storage, so a first-time visitor is not
  // told their work was restored.
  const hadSaved = useRef<boolean | null>(null);
  if (hadSaved.current === null) {
    hadSaved.current = typeof window !== 'undefined' && hasSavedDesign();
  }

  useEffect(() => {
    void useDesigner.persist.rehydrate();
    if (!hadSaved.current) return;
    toast(t('restored'), {
      action: { label: t('restoredAction'), onClick: () => reset() },
    });
    // Runs once on mount; the translations and reset action are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast(t('preview.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="shell pb-28 pt-5 lg:pb-12 lg:pt-8">
      {/*
        Title, examples and tabs travel together and stay under the site
        header. On a phone the preview pins beneath them, so the whole of the
        top of the screen is the sign and the way around it.
      */}
      <div
        ref={headerRef}
        className="sticky z-40 -mx-5 bg-surface/95 px-5 pb-px backdrop-blur-md md:-mx-8 md:px-8 lg:mx-0 lg:px-0"
        style={{ top: HEADER }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-3 pt-3">
          <h1 className="display text-[clamp(1.4rem,2.6vw,1.85rem)]">{t('title')}</h1>

          {/*
            One scrolling row on a narrow screen rather than two wrapped rows:
            every row here pushes the sign further down the phone.
          */}
          <div className="no-scrollbar -mx-5 flex w-[calc(100%+2.5rem)] items-baseline gap-x-2 overflow-x-auto px-5 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0">
            <span className="shrink-0 text-[0.75rem] text-ink-3">{t('examples')}</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="shrink-0 rounded-sm border border-rule px-2.5 py-1 text-[0.8125rem] text-ink-2 transition hover:border-oak hover:bg-surface-2 hover:text-ink"
              >
                {preset.name[locale === 'en' ? 'en' : 'sv']}
              </button>
            ))}
          </div>
        </div>

        {/*
          overflow-x-auto on its own gave this row a vertical scrollbar, arrows
          and all, because the active-tab underline sits a pixel below the box.
          Clipping the vertical axis and hiding the bar removes it.
        */}
        <div
          role="tablist"
          aria-label={t('title')}
          className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden border-b border-rule"
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
                  'relative shrink-0 px-3 pb-2.5 pt-1.5 text-[0.875rem] transition',
                  selected ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {t(`steps.${id}`)}
                <span
                  className={cx(
                    'absolute inset-x-2 bottom-0 h-0.5 rounded-full transition',
                    selected ? 'bg-oak' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* ── Preview ───────────────────────────────────────────────────── */}
        <div
          className="sticky z-30 -mx-5 bg-surface/95 px-5 pb-3 pt-3 backdrop-blur-md md:-mx-8 md:px-8 lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none"
          style={{ top: `calc(${HEADER} + ${headerHeight}px)` }}
        >
          {/* The board sits in a lit recess rather than on a flat card: an
              inset ground, a lifted rim, and a pool of warm light behind it. */}
          <div className="relative overflow-hidden rounded-lg border border-rule-strong bg-surface p-3 shadow-lift sm:p-5 lg:p-7">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--color-oak) 12%, transparent) 0%, transparent 60%)',
              }}
            />
            <span className="pointer-events-none absolute inset-0 shadow-[var(--shadow-inset)]" aria-hidden="true" />
            <span className="relative block">
            <SignPreview
              design={design}
              svgRef={svgRef}
              label={t('preview.aria', {
                wood: wood.name[locale === 'en' ? 'en' : 'sv'],
                width: design.widthMm,
                height: design.heightMm,
              })}
              className="mx-auto h-[22vh] w-full max-w-full sm:h-[30vh] lg:h-auto lg:max-h-[48vh]"
            />
            </span>
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

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="mt-5 lg:mt-0">
          {step === 'text' && <TextStep />}
          {step === 'shape' && <ShapeStep />}
          {step === 'material' && <MaterialStep />}
          {step === 'detail' && <DetailStep />}

          <div className="mt-7 hidden flex-col gap-3 border-t border-rule pt-6 lg:flex">
            <PriceCard price={price} />
            <OrderButton orderable={orderable} />
          </div>
        </div>
      </div>

      {/* ── Phone: price and the way forward, always reachable ─────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-md lg:hidden">
        <div className="shell flex items-center gap-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="label block">{t('mobile.priceLabel')}</span>
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
