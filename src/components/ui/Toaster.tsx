'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * Transient messages.
 *
 * The one thing that needed this was the notice that a half-finished design had
 * been restored. It used to be a panel wedged in above the designer, which
 * pushed the whole tool down the page to say something that stops being
 * interesting after two seconds. A toast says it and leaves.
 *
 * Styled from our own tokens rather than sonner's defaults, so it belongs to
 * the site rather than looking like a component borrowed from somewhere else.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      // The designer's price bar owns the bottom of a phone screen, so toasts
      // are lifted clear of it.
      offset={16}
      mobileOffset={{ bottom: 84, left: 12, right: 12 }}
      duration={5000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-md border border-rule-strong bg-surface-2 ' +
            'px-4 py-3 text-[0.875rem] text-ink shadow-lift',
          title: 'font-medium',
          description: 'text-ink-3',
          actionButton:
            'ml-auto shrink-0 rounded-sm border border-rule-strong px-2.5 py-1.5 ' +
            'text-[0.8125rem] text-ink transition hover:bg-surface-3',
          closeButton: 'text-ink-3 hover:text-ink',
        },
      }}
    />
  );
}
