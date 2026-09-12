'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ButtonLink } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cx } from '@/lib/cx';

/**
 * The designer.
 *
 * The page scrolls, and the sign stays put.
 *
 * There is one scrollbar — the document's. The preview is sticky, so it holds
 * its place under the header while the controls travel past it, and the page
 * ends where the controls do. An earlier version gave the controls their own
 * scroll container inside a viewport-height shell; it kept the sign in view,
 * but at the cost of a second scrollbar, a wheel that did different things
 * over different halves of the screen, and a page that would not respond to
 * End or Page Down. Sticky gets the same result out of the browser's own
 * scrolling.
 *
 * Nothing about the board — its size, its shape, its proportions — changes the
 * layout, because the preview draws into a frame of fixed ratio and centres
 * the sign inside it.
 *
 * The title, examples and tabs sit at the top of the controls and are sticky
 * in their own right, so the way between steps is always in reach. On a phone
 * there is no second column: the sign pins to the top and everything else
 * flows beneath it.
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

  // Read before any effect writes to storage, so a first-time visitor is not
  // told their work was restored.
  const hadSaved = useRef<boolean | null>(null);
  if (hadSaved.current === null) {
    hadSaved.current = typeof window !== 'undefined' && hasSavedDesign();
  }

  /*
    Announced once, however many times this effect runs.

    React's StrictMode deliberately invokes mount effects twice in development
    to surface exactly this class of bug — a side effect that is not safe to
    repeat. Raising a toast is one: the guard below made it two on every reload
    while developing. The explicit toast id is a second line of defence, since
    sonner replaces a toast that reuses an id rather than stacking another.
  */
  const announcedRestore = useRef(false);

  useEffect(() => {
    void useDesigner.persist.rehydrate();
    if (!hadSaved.current || announcedRestore.current) return;
    announcedRestore.current = true;
    toast(t('restored'), {
      id: 'design-restored',
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
    // items-start matters: a stretched flex child cannot be sticky, because it
    // is already as tall as the row and has nowhere to travel.
    <div
      className={cx(
        'lg:flex lg:items-start',
        // The header plus the sticky tab rail beneath it. The summary below
        // subtracts this from the viewport so it comes to rest directly under
        // the tabs rather than behind them.
        '[--designer-rail:11.75rem]',
        /*
          A footer's worth of extra travel for the sign, taken back again.

          A sticky element may only move inside its parent's *content* box, so
          the sign came unpinned the instant the columns ended: scroll on into
          the footer and it slid up behind the header. The controls column
          below carries a footer's height of bottom padding, which lengthens
          that content box; this negative margin pulls the footer back up by
          the same amount, so it still begins immediately under the columns and
          the page is exactly as long as it was. The sign now holds its place
          all the way to the end of the document.

          304 px against the footer's 316: a shade under, so the padding can
          never push past the last pixel of the page.
        */
        'lg:-mb-[19rem]',
      )}
    >
      {/* ── The sign. Holds still and takes the room. ─────────────────── */}
      <section
        className={cx(
          'relative flex flex-col border-rule bg-surface-2',
          // Sticky at both sizes, just at different heights: a band across the
          // top of a phone, a full-height column beside the controls on a wide
          // screen.
          'sticky top-16 z-30 border-b px-4 pb-3 pt-3',
          'lg:top-16 lg:h-[calc(100dvh-4rem)] lg:min-w-0 lg:flex-1 lg:self-start',
          'lg:border-b-0 lg:border-r lg:p-6 xl:p-8',
        )}
      >
        <div className="relative lg:min-h-0 lg:flex-1">
          {/* A pool of warm light behind the board, so it sits in a lit recess
              rather than on a flat panel. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(90% 70% at 50% 40%, color-mix(in oklab, var(--color-oak) 13%, transparent) 0%, transparent 65%)',
            }}
          />
          <SignPreview
            design={design}
            svgRef={svgRef}
            label={t('preview.aria', {
              wood: wood.name[locale === 'en' ? 'en' : 'sv'],
              width: design.widthMm,
              height: design.heightMm,
            })}
            className="relative mx-auto h-[26vh] w-full sm:h-[32vh] lg:h-full"
          />
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          <span className="spec truncate">
            {design.widthMm} × {design.heightMm} mm · {wood.name[locale === 'en' ? 'en' : 'sv']}
          </span>
          <span className="flex shrink-0 gap-0.5">
            <IconButton label={t('preview.download')} onClick={download} disabled={downloading}>
              {downloading ? (
                <Loader2 size={15} aria-hidden className="animate-spin" />
              ) : (
                <Download size={15} aria-hidden />
              )}
            </IconButton>
            <IconButton
              label={t('reset')}
              onClick={() => {
                if (window.confirm(t('resetConfirm'))) reset();
              }}
            >
              <RotateCcw size={15} aria-hidden />
            </IconButton>
          </span>
        </div>
      </section>

      {/* ── The controls. The only thing that scrolls. ────────────────── */}
      <section
        className={cx(
          'flex flex-col lg:w-[26rem] lg:shrink-0 xl:w-[29rem]',
          // The run-off the negative margin above is paid out of.
          'lg:pb-[19rem]',
          /*
            And the guarantee that it is this column, not the sign, that sets
            the row's height: viewport minus header, plus that same run-off. If
            the sign were ever the taller of the two, pulling the footer up by
            19rem would drag it over the sign instead of over empty padding.
          */
          'lg:min-h-[calc(100dvh+15rem)]',
        )}
      >
        {/*
          Sticky only where it has a column of its own. On a phone this sits
          directly below the sticky preview, and two sticky siblings at the
          same offset simply stack on top of each other — the tabs would slide
          under the sign and vanish. There they scroll with the controls.
        */}
        <div className="z-20 border-b border-rule bg-surface/95 px-4 pt-3 backdrop-blur-md lg:sticky lg:top-16 lg:px-6">
          <h1 className="display text-[1.25rem] leading-none">{t('title')}</h1>

          {/*
            One scrolling row on a narrow screen rather than two wrapped rows:
            every row here pushes the sign further up the phone.
          */}
          <div className="no-scrollbar -mx-4 mt-2.5 flex items-baseline gap-x-2 overflow-x-auto px-4 lg:-mx-6 lg:px-6">
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

          {/*
            overflow-x-auto alone gave this row a vertical scrollbar, arrows and
            all, because the active-tab underline sits a pixel below the box.
            Clipping the vertical axis and hiding the bar removes it.
          */}
          <div
            role="tablist"
            aria-label={t('title')}
            className="no-scrollbar -mx-4 mt-2 flex gap-1 overflow-x-auto overflow-y-hidden px-4 lg:-mx-6 lg:px-6"
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

        <div className="px-4 pb-40 pt-4 lg:px-6 lg:pb-0">
          {step === 'text' && <TextStep />}
          {step === 'shape' && <ShapeStep />}
          {step === 'material' && <MaterialStep />}
          {step === 'detail' && <DetailStep />}

          {/*
            The summary gets a screen of its own.

            Its height is the viewport less the header and the tab rail above
            it, which means the bottom of the column and the bottom of the
            window meet at the exact moment the price arrives directly under
            the tabs. The run-off underneath is not padding for its own sake:
            it is what makes the end of the scroll a composed view rather than
            a place you happen to stop, and it keeps the pinned sign still
            through an over-scroll, since the sign only travels once its
            containing block runs out.
          */}
          <div className="mt-7 hidden flex-col gap-3 border-t border-rule pt-6 lg:flex lg:min-h-[calc(100dvh-var(--designer-rail))]">
            <PriceCard price={price} />
            <OrderButton orderable={orderable} />
          </div>
        </div>
      </section>

      {/* ── Phone: price and the way forward, always reachable ─────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
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
