'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowRight, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { getWood } from '@/config/woods';
import { formatOre, priceSign } from '@/lib/designer/pricing';
import type { WoodId } from '@/config/woods';
import { useSign } from '@/lib/sign/store';
import { toSignDesign } from '@/lib/sign/draft';
import { ButtonLink } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Board } from './Board';
import { Lettering, type Rect } from './Lettering';
import { CutChoice, FinishChoice, ShapeChoice, SizeChoice, WoodChoice } from './Choices';
import { useFitLettering, useOutline } from './useOutline';
import { cx } from '@/lib/cx';

/**
 * The designer.
 *
 * The arrangement is the argument. A sign has two kinds of decision and they
 * are kept apart: what the lettering says and how it sits, which happen on the
 * sign itself; and what the board is — its size, its shape, its timber, how it
 * is cut and finished — which happen in the panel. Nothing is in both places,
 * and nothing that can be done by touching the sign is offered as a slider.
 *
 * What that removes: a nine-point placement grid, two per-cent position
 * sliders, a size slider, a tracking slider, a font list of nine rows, an
 * alignment control and a set of tabs to hide them all behind. What replaces
 * them is a drag, a corner, and a small panel that appears beside the words
 * when you click them.
 *
 * The price is always on screen. It used to be at the bottom of a column you
 * had to reach the end of, which made the one number everybody wants the one
 * thing they had to go looking for.
 */
export function SignDesigner() {
  const locale = useLocale() === 'en' ? 'en' : 'sv';
  const draft = useSign((s) => s.draft);
  const commit = useSign((s) => s.commit);
  const select = useSign((s) => s.select);
  const selected = useSign((s) => s.selected);
  const undo = useSign((s) => s.undo);
  const redo = useSign((s) => s.redo);
  const reset = useSign((s) => s.reset);
  const canUndo = useSign((s) => s.past.length > 0);
  const canRedo = useSign((s) => s.future.length > 0);

  /*
    Held in state rather than a ref because the panel beside the lettering is
    positioned against this element, so the render that first has the node has
    to be followed by one that can use it.
  */
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [editing, setEditing] = useState(false);

  const outline = useOutline(draft);
  useFitLettering(draft, outline);
  const price = useMemo(() => priceSign(toSignDesign(draft)), [draft]);
  const wood = getWood(draft.woodId);
  const empty = outline === null;

  const edit = useCallback(() => {
    select(true);
    setEditing(true);
  }, [select]);

  const priceRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({ footer: 0, runOff: 0 });

  /*
    Two measurements the layout cannot express on its own.

    `footer` is how tall the site footer is. The row below lends the sticky sign
    that much extra travel and takes the same amount back with a negative
    margin, so the sign holds its place to the last pixel of the page instead of
    sliding up as the footer arrives. It was a hard-coded 19rem until now, which
    was twelve pixels short of the real footer — and twelve pixels of drift at
    the very end of the scroll is exactly the sort of thing you feel without
    being able to name.

    `runOff` is the space after the price so that, when the column bottoms out,
    the summary comes to rest level with the top of the board rather than at the
    bottom of the window. Measured from the board's own outline, because the
    drawing is letterboxed inside its box and the two tops are not the same.
  */
  useEffect(() => {
    const measure = () => {
      const footer = document.querySelector('footer');
      const board = document.querySelector('[data-board]');
      const price = priceRef.current;
      if (!footer || !board || !price) return;
      const boardTop = board.getBoundingClientRect().top;
      const footerHeight = footer.getBoundingClientRect().height;
      // At the end of the scroll the column's last visible pixel is the top of
      // the footer, not the bottom of the window, so the footer comes out of
      // the sum as well as the board and the summary itself.
      const visible = window.innerHeight - footerHeight;
      setMetrics({
        footer: Math.round(footerHeight),
        runOff: Math.max(Math.round(visible - boardTop - price.getBoundingClientRect().height), 0),
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
  }, [draft.widthMm, draft.heightMm, draft.shape]);

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
          than against the board, so that it can leave the board entirely on a
          phone: there it drops into the flow underneath, and only from lg up
          does it float over the wood.
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
            label={`Skylt ${draft.widthMm} × ${draft.heightMm} mm`}
            className="relative mx-auto h-[32vh] w-full sm:h-[38vh] lg:h-full"
            onLetteringRect={setRect}
            onEdit={edit}
            editing={editing}
          />
        </div>

        <Lettering rect={rect} stage={stage} editing={editing} onEditingChange={setEditing} />

        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          {/*
            One line that says what the sign is and what to do with it. The
            second half changes as the state does, so it is never telling you
            about something you have already done.
          */}
          <span className="text-ink-3 min-w-0 truncate text-[0.75rem]">
            <span className="spec">
              {draft.widthMm} × {draft.heightMm} mm · {wood.name[locale]}
            </span>
            <span className="mx-2 opacity-40">·</span>
            {empty
              ? 'Klicka på skylten för att skriva'
              : selected
                ? 'Dra för att flytta · hörnet ändrar storleken'
                : 'Klicka på texten för att ändra den'}
          </span>

          <span className="flex shrink-0 gap-0.5">
            <IconButton label="Ångra" onClick={undo} disabled={!canUndo}>
              <Undo2 size={15} aria-hidden />
            </IconButton>
            <IconButton label="Gör om" onClick={redo} disabled={!canRedo}>
              <Redo2 size={15} aria-hidden />
            </IconButton>
            <IconButton label="Börja om" onClick={reset}>
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
              widthMm={draft.widthMm}
              heightMm={draft.heightMm}
              /*
              Changing the board carries the lettering with it, in proportion.
              Keeping the millimetres instead would leave a line that sat in the
              middle of a 220 mm board sitting low on a 150 mm one, for no
              reason the person choosing a smaller board would recognise.
            */
              onChange={(size) =>
                commit((d) => ({
                  ...d,
                  ...size,
                  block: {
                    ...d.block,
                    xMm: (d.block.xMm / d.widthMm) * size.widthMm,
                    yMm: (d.block.yMm / d.heightMm) * size.heightMm,
                  },
                }))
              }
            />
            <ShapeChoice
              value={draft.shape}
              onChange={(shape) => commit((d) => ({ ...d, shape }))}
            />
            <WoodChoice
              value={draft.woodId}
              locale={locale}
              onChange={(woodId) => commit((d) => ({ ...d, woodId: woodId as WoodId }))}
            />
            <CutChoice
              value={draft.method}
              onChange={(method) => commit((d) => ({ ...d, method }))}
            />
            <FinishChoice
              value={draft.finish}
              onChange={(finish) => commit((d) => ({ ...d, finish }))}
            />
          </div>

          {/*
          The price rides the bottom of the window while there is column left,
          and then comes to rest level with the top of the board.

          That resting place is what the run-off underneath buys. A sticky
          element stops sticking when its own container's bottom reaches it, so
          ending this container a board's-height early — rather than flush with
          the column — lands the summary beside the sign at the end of the
          scroll instead of in the corner of the screen.
        */}
          <div
            data-price=""
            ref={priceRef}
            className="border-rule bg-surface/95 sticky bottom-0 z-20 mt-auto border-t backdrop-blur-md"
          >
            <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
              <span className="min-w-0 flex-1">
                <span className="spec block leading-none">Att betala · inkl. moms</span>
                <span className="display text-ink mt-1 block truncate text-[1.5rem] leading-none">
                  {formatOre(price.totalOre, locale)}
                </span>
              </span>
              {empty ? (
                <span className="border-rule text-ink-3 inline-flex h-11 shrink-0 items-center rounded-sm border px-4 text-center text-[0.8125rem]">
                  Skriv något först
                </span>
              ) : (
                <ButtonLink href="/designer/order" variant="primary" className="h-11 shrink-0">
                  Gå vidare <ArrowRight size={16} aria-hidden />
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
