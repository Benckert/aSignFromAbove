'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cx } from '@/lib/cx';

/**
 * Dark and light.
 *
 * The site is dark by default. A visitor who prefers otherwise switches here
 * and the choice is remembered on their own device — that single value in
 * localStorage is the only thing this site stores about a reader, it holds
 * nothing but the word `dark` or `light`, and it is described in the cookie
 * policy. Under ePrivacy it is storage strictly necessary for a preference the
 * user themselves asked for, so it needs no consent banner.
 *
 * The matching no-flash script in `ThemeScript` applies the stored choice
 * before the first paint, so the page never starts in the wrong theme and
 * lurches.
 */

export const THEME_KEY = 'asfa.theme';
type Theme = 'dark' | 'light';

/**
 * The theme lives on the <html> element, put there by the no-flash script
 * before React exists. That makes it external state, so it is read with
 * useSyncExternalStore rather than mirrored into a useState — which would mean
 * rendering once with a guess and then correcting it.
 *
 * The server snapshot is 'dark' because that is what the document ships with.
 */
const THEME_EVENT = 'asfa:themechange';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function ThemeToggle({ className, label }: { className?: string; label: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark' as Theme);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked; the choice simply will not survive a reload.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 transition',
        'hover:bg-surface-3 hover:text-ink',
        className,
      )}
      aria-label={label}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}

/**
 * Applies the stored theme before the browser paints.
 *
 * This has to be a blocking inline script: anything deferred, or anything that
 * waits for React, runs after the first paint and produces a visible flash of
 * the wrong theme. It is deliberately tiny and touches nothing but one
 * attribute.
 */
export function ThemeScript() {
  const script = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
