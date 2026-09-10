'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cx } from '@/lib/cx';

/**
 * Workshop light, or after dark.
 *
 * Both themes are dark — this is not a light/dark switch, it is a choice
 * between a warm mid-brown ground and the same room with the lamps down.
 * There is no white page on this site.
 *
 * The choice is remembered on the visitor's own device. That single value in
 * localStorage is the only thing this site stores about a reader, it holds
 * nothing but the word `warm` or `night`, and it is described in the cookie
 * policy. Under ePrivacy it is storage strictly necessary for a preference the
 * user themselves asked for, so it needs no consent banner.
 *
 * The theme lives on the <html> element, put there by the no-flash script
 * before React exists, which makes it external state — hence
 * useSyncExternalStore rather than mirroring it into a useState that would
 * render once with a guess and then correct itself.
 */

export const THEME_KEY = 'asfa.theme';
type Theme = 'warm' | 'night';

const THEME_EVENT = 'asfa:themechange';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'night' ? 'night' : 'warm';
}

export function ThemeToggle({ className, label }: { className?: string; label: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'warm' as Theme);

  function toggle() {
    const next: Theme = theme === 'warm' ? 'night' : 'warm';
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
      {theme === 'warm' ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
    </button>
  );
}

/**
 * Applies the stored theme before the browser paints.
 *
 * Has to be a blocking inline script: anything deferred runs after the first
 * paint and produces a visible flash of the wrong theme. It touches nothing
 * but one attribute.
 */
export function ThemeScript() {
  const script = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.setAttribute('data-theme',t==='night'?'night':'warm')}catch(e){document.documentElement.setAttribute('data-theme','warm')}`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
