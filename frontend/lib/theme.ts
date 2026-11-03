'use client';
import {useCallback, useEffect, useState} from 'react';

// Shared dark/light theme for the whole CeloDesk app (landing + dashboard).
// The chosen theme is stored in localStorage and reflected as a data-theme
// attribute on <html>; both the landing and app CSS modules override their
// tokens off :global(html[data-theme="light"]). A no-flash inline script in
// app/layout.tsx applies it before first paint.
export type Theme = 'dark' | 'light';
export const THEME_KEY = 'celodesk-theme';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(t: Theme) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = t;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const sync = () => { const t = readTheme(); setTheme(t); applyTheme(t); };
    sync();
    window.addEventListener(THEME_KEY, sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(THEME_KEY, sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_KEY));
  }, []);

  return {theme, toggle};
}
