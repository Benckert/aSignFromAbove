'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cx } from '@/lib/cx';

/**
 * A small explanation, on demand.
 *
 * Consent fine print has to be available — it is what makes the consent
 * informed — but printed under every tick box it turns a two-line form into a
 * wall of grey text nobody reads, which is the opposite of informed.
 *
 * Opens on hover for a mouse and on click or Enter for touch and keyboard, and
 * the text stays in the DOM either way so a screenreader reaches it through
 * aria-describedby regardless of whether it is visible.
 *
 * Positioned in fixed coordinates and clamped to the viewport rather than
 * simply centred on its trigger. A tooltip centred on an icon near the right
 * edge of a narrow screen hangs off it — which is exactly where this one sits,
 * at the end of a consent label on a phone.
 */

/** Keep this much clear of the viewport edge. */
const EDGE = 12;
export function Tooltip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLSpanElement | null>(null);
  const bubble = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const place = useCallback(() => {
    const trigger = wrapper.current?.getBoundingClientRect();
    const box = bubble.current?.getBoundingClientRect();
    if (!trigger || !box) return;

    const centred = trigger.left + trigger.width / 2 - box.width / 2;
    const maxLeft = window.innerWidth - box.width - EDGE;
    setPos({
      left: Math.min(Math.max(centred, EDGE), Math.max(maxLeft, EDGE)),
      // Above the trigger, or below it when there is no room above.
      top: trigger.top - box.height - 8 < EDGE ? trigger.bottom + 8 : trigger.top - box.height - 8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // A tap elsewhere closes it; on a phone there is no pointer to leave.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapper}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-grid h-4 w-4 place-items-center rounded-full text-ink-3 transition hover:text-ink"
      >
        <Info size={13} aria-hidden />
      </button>

      <span
        ref={bubble}
        id={id}
        role="tooltip"
        // Parked at the origin while closed rather than pushed off-screen: it
        // is invisible either way, and it still needs to be measurable so the
        // first open can place it correctly.
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
        className={cx(
          'fixed z-50 w-[min(19rem,calc(100vw-1.5rem))]',
          'rounded-md border border-rule-strong bg-surface-3 px-3 py-2.5 text-left',
          'text-[0.75rem] leading-relaxed text-ink-2 shadow-lift transition-opacity',
          open && pos ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        {children}
      </span>
    </span>
  );
}
