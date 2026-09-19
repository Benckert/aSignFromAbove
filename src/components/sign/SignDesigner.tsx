'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Plus, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { getWood } from '@/config/woods';
import { canHoldAll, useFacesReady } from '@/lib/sign/measure';
import { MAX_BLOCKS, type Border, type Sign, type SignShape } from '@/lib/sign/model';
import { formatOre, priceSign } from '@/lib/sign/pricing';
import { useSign, wasRestored } from '@/lib/sign/store';
import { isBlank } from '@/lib/sign/text';
import type { WoodId } from '@/config/woods';
import { ButtonLink } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Board, type Rect } from './Board';
import { BlockPanel } from './BlockPanel';
import {
  BorderChoice,
  CutChoice,
  EdgeChoice,
  FinishChoice,
  HangingChoice,
  ShapeChoice,
  SizeChoice,
  WoodChoice,
  type Size,
} from './Choices';
import { useFitBlocks } from './useFit';
import { cx } from '@/lib/cx';

/**
 * The designer.
 *
 * The arrangement is the argument. A sign has two kinds of decision and they
 * are kept apart: what the lettering says and how it sits, which happen on the
 * sign itself; and what the board is — its size, its shape, its timber, how it
 * is cut, finished, framed and hung — which happen in the panel. Nothing is in
 * both places, and nothing that can be done by touching the sign is offered as
 * a slider as well.
 *
 * The price is always on screen. It used to be at the bottom of a column you
 * had to reach the end of, which made the one number everybody wants the one
 * thing they had to go looking for.
 */
export function SignDesigner() {
  const t = useTranslations('designer');
  const locale = useLocale() === 'en' ? 'en' : 'sv';

  const sign = useSign((s) => s.sign);
  const commit = useSign((s) => s.commit);
  const select = useSign((s) => s.select);
  const selectedId = useSign((s) => s.selectedId);
  const addBlock = useSign((s) => s.addBlock);
  const undo = useSign((s) => s.undo);
  const redo = useSign((s) => s.redo);
  const reset = useSign((s) => s.reset);
  const canUndo = useSign((s) => s.past.length > 0);
  const canRedo = useSign((s) => s.future.length > 0);

  useFitBlocks();

  /*
    Held in state rather than a ref because the panel beside the lettering is
    positioned against this element, so the render that first has the node has
    to be followed by one that can use it.
  */
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [editing, setEditing] = useState(false);

  const price = useMemo(() => priceSign(sign), [sign]);
  const wood = getWood(sign.woodId);
  const empty = sign.blocks.every((block) => isBlank(block.text));

  const edit = useCallback(() => setEditing(true), []);

  /*
    Which boards, shapes and borders could still carry what is written.

    A face has a smallest letter it can be cut at, so a long name genuinely
    will not go on a small board — and the honest thing to do with a choice
    that cannot be honoured is not to offer it. Recomputed only when the words,
    the faces or the board change; moving lettering around cannot affect
    whether it fits.
  */
  const facesReady = useFacesReady();
  const holds = useMemo(() => {
    const allow = (over: Partial<Sign>) => !facesReady || canHoldAll({ ...sign, ...over });
    return {
      size: (next: Size) => allow(next),
      shape: (next: SignShape) => allow({ shape: next }),
      border: (next: Border) => allow({ border: next }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facesReady, sign.blocks, sign.widthMm, sign.heightMm, sign.shape, sign.border]);

  /* ── Rehydration ───────────────────────────────────────────────────── */

  /*
    Storage is read after mount, never during a render. Reading it while
    rendering would give the browser different markup from the one the server
    sent, which React reports as a hydration mismatch and repairs by throwing
    the server's work away.

    Whether anything was actually restored is worth saying out loud. A customer
    who comes back to a sign they half-drew last week and is shown it without
    explanation cannot tell their own work from the tool's default, and the
    first thing they reach for is a way to clear it — so the notice arrives
    with one.
  */
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    void Promise.resolve(useSign.persist.rehydrate()).then(() => setRestored(wasRestored()));
  }, []);

  /* ── Two measurements the layout cannot express on its own ─────────── */

  const priceRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({ footer: 0, runOff: 0 });

  /*
    `footer` is how tall the site footer is. The column below lends the sticky
    sign that much extra travel and takes the same amount back with a negative
    margin, so the sign holds its place to the last pixel of the page instead of
    sliding up as the footer arrives. It was a hard-coded 19rem once, which was
    twelve pixels short of the real footer — and twelve pixels of drift at the
    very end of a scroll is exactly the sort of thing you feel without being
    able to name.

    `runOff` is the space after the price so that, when the column bottoms out,
    the summary comes to rest level with the top of the board rather than at the
    bottom of the window. Measured from the board's own outline, because the
    drawing is letterboxed inside its box and the two tops are not the same.
  */
  useEffect(() => {
    const measure = () => {
      const footer = document.querySelector('footer');
      const board = document.querySelector('[data-board]');
      const summary = priceRef.current;
      if (!footer || !board || !summary) return;
      const boardTop = board.getBoundingClientRect().top;
      const footerHeight = footer.getBoundingClientRect().height;
      // At the end of the scroll the column's last visible pixel is the top of
      // the footer, not the bottom of the window, so the footer comes out of
      // the sum as well as the board and the summary itself.
      const visible = window.innerHeight - footerHeight;
      setMetrics({
        footer: Math.round(footerHeight),
        runOff: Math.max(
          Math.round(visible - boardTop - summary.getBoundingClientRect().height),
          0,
        ),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    const footer = document.querySelector('footer');
    if (footer) observer.observe(footer);
    if (priceRef.current) observer.observe(priceRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [sign.widthMm, sign.heightMm, sign.shape]);

  // Undo belongs to the page: a change made in the panel has to be undoable
  // from wherever the focus happens to be.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      // Leave the browser's own undo alone while somebody is typing.
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const hint = empty
    ? t('board.hintEmpty')
    : selectedId
      ? t('board.hintSelected')
      : t('board.hintIdle');

  // The notice stands down as soon as the customer touches anything: by then
  // the sign is theirs again and saying where it came from is just noise.
  const showRestored = restored && !canUndo;

  return (
    <div
      className={cx('lg:flex lg:items-start', 'lg:mb-[calc(var(--footer-h)*-1)]')}
      style={
        {
          '--footer-h': `${metrics.footer}px`,
          '--run-off': `${metrics.runOff}px`,
        } as React.CSSProperties
      }
    >
      {/* ── The sign ───────────────────────────────────────────────────── */}

      <section
        /*
          The panel beside the lettering is positioned against this box rather
          than against the board, so it can leave the board entirely on a phone:
          there it drops into the flow underneath, and only from lg up does it
          float over the wood.
        */
        ref={setStage}
        className={cx(
          'border-rule bg-surface-2 relative sticky top-16 z-30 flex flex-col border-b px-4 pt-3 pb-3',
          'lg:top-16 lg:h-[calc(100dvh-4rem)] lg:min-w-0 lg:flex-1 lg:self-start',
          'lg:border-r lg:border-b-0 lg:p-6 xl:p-8',
        )}
      >
        <div className="relative lg:min-h-0 lg:flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(90% 70% at 50% 40%, color-mix(in oklab, var(--color-oak) 13%, transparent) 0%, transparent 65%)',
            }}
          />
          <Board
            label={t('preview.aria', {
              wood: wood.name[locale],
              width: sign.widthMm,
              height: sign.heightMm,
            })}
            className="relative mx-auto h-[32vh] w-full sm:h-[38vh] lg:h-full"
            onSelectedRect={setRect}
            onEdit={edit}
            editing={editing}
            emptyLabel={t('board.empty')}
          />
        </div>

        <BlockPanel rect={rect} stage={stage} editing={editing} onEditingChange={setEditing} />

        {showRestored && (
          <p className="text-ink-3 mt-2 flex shrink-0 items-center gap-2 text-[0.75rem]">
            <span>{t('restored')}</span>
            <button
              type="button"
              onClick={() => {
                reset();
                setRestored(false);
              }}
              className="text-oak-deep hover:text-ink underline-offset-4 transition hover:underline"
            >
              {t('restoredAction')}
            </button>
          </p>
        )}

        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          {/*
            One line that says what the sign is and what to do with it. The
            second half changes as the state does, so it is never telling you
            about something you have already done.
          */}
          <span className="text-ink-3 min-w-0 truncate text-[0.75rem]">
            <span className="spec">
              {t('board.spec', {
                width: sign.widthMm,
                height: sign.heightMm,
                wood: wood.name[locale],
              })}
            </span>
            <span className="mx-2 opacity-40">·</span>
            {hint}
          </span>

          <span className="flex shrink-0 gap-0.5">
            <IconButton
              label={sign.blocks.length >= MAX_BLOCKS ? t('board.blockFull') : t('board.addBlock')}
              onClick={() => {
                addBlock();
                setEditing(true);
              }}
              disabled={sign.blocks.length >= MAX_BLOCKS}
            >
              <Plus size={15} aria-hidden />
            </IconButton>
            <IconButton label={t('actions.undo')} onClick={undo} disabled={!canUndo}>
              <Undo2 size={15} aria-hidden />
            </IconButton>
            <IconButton label={t('actions.redo')} onClick={redo} disabled={!canRedo}>
              <Redo2 size={15} aria-hidden />
            </IconButton>
            <IconButton
              label={t('actions.reset')}
              onClick={() => {
                reset();
                select(null);
              }}
            >
              <RotateCcw size={15} aria-hidden />
            </IconButton>
          </span>
        </div>
      </section>

      {/* ── The board ──────────────────────────────────────────────────── */}

      <section
        className={cx(
          'flex flex-col lg:w-[25rem] lg:shrink-0 xl:w-[27rem]',
          // Tall enough that this column, and not the sign, sets the row's
          // height — otherwise pulling the footer up would drag it over the sign.
          'lg:min-h-[calc(100dvh+var(--footer-h))] lg:pb-[var(--footer-h)]',
        )}
      >
        {/*
          Everything down to the summary shares one tall box, because a sticky
          element may only move inside its own container — wrapped snugly round
          the price it would have had nowhere to travel and would have scrolled
          away like any other block.
        */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-7 px-4 pt-6 pb-6 lg:px-6">
            <SizeChoice
              widthMm={sign.widthMm}
              heightMm={sign.heightMm}
              canHold={holds.size}
              /*
                Changing the board carries the lettering with it, in proportion.
                Keeping the millimetres instead would leave a line that sat in
                the middle of a 220 mm board sitting low on a 150 mm one, for no
                reason the person choosing a smaller board would recognise.
              */
              onChange={(size) =>
                commit((current) => ({
                  ...current,
                  ...size,
                  blocks: current.blocks.map((block) => ({
                    ...block,
                    xMm: (block.xMm / current.widthMm) * size.widthMm,
                    yMm: (block.yMm / current.heightMm) * size.heightMm,
                  })),
                }))
              }
            />
            <ShapeChoice
              value={sign.shape}
              canHold={holds.shape}
              onChange={(shape) => commit((current) => ({ ...current, shape }))}
            />
            <EdgeChoice
              value={sign.edge}
              onChange={(edge) => commit((current) => ({ ...current, edge }))}
            />
            <WoodChoice
              value={sign.woodId}
              locale={locale}
              onChange={(woodId) => commit((current) => ({ ...current, woodId: woodId as WoodId }))}
            />
            <BorderChoice
              value={sign.border}
              shape={sign.shape}
              canHold={holds.border}
              onChange={(border) => commit((current) => ({ ...current, border }))}
            />
            <CutChoice
              value={sign.method}
              onChange={(method) => commit((current) => ({ ...current, method }))}
            />
            <FinishChoice
              value={sign.finish}
              onChange={(finish) => commit((current) => ({ ...current, finish }))}
            />
            <HangingChoice
              value={sign.hanging}
              onChange={(hanging) => commit((current) => ({ ...current, hanging }))}
            />
          </div>

          {/*
            The price rides the bottom of the window while there is column left,
            and then comes to rest level with the top of the board.

            That resting place is what the run-off underneath buys. A sticky
            element stops sticking when its own container's bottom reaches it,
            so ending this container a board's-height early — rather than flush
            with the column — lands the summary beside the sign at the end of
            the scroll instead of in the corner of the screen.
          */}
          <div
            data-price=""
            ref={priceRef}
            className="border-rule bg-surface/95 sticky bottom-0 z-20 mt-auto border-t backdrop-blur-md"
          >
            <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
              <span className="min-w-0 flex-1">
                <span className="spec block leading-none">
                  {t('price.total')} · {t('price.incVat')}
                </span>
                <span className="display text-ink mt-1 block truncate text-[1.5rem] leading-none">
                  {formatOre(price.totalOre)}
                </span>
              </span>
              {empty ? (
                <span className="border-rule text-ink-3 inline-flex h-11 shrink-0 items-center rounded-sm border px-4 text-center text-[0.8125rem]">
                  {t('order.ctaEmpty')}
                </span>
              ) : (
                <ButtonLink href="/designer/order" variant="primary" className="h-11 shrink-0">
                  {t('order.cta')} <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        {/* The space the summary comes to rest above. */}
        <div aria-hidden="true" className="hidden lg:block lg:h-[var(--run-off)]" />
      </section>
    </div>
  );
}
