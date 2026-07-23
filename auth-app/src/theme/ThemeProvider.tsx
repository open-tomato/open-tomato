import type { ThemeName } from '@open-tomato/ui-components';
import type { ReactNode } from 'react';

import { useEffect, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextValue } from './theme-context';

const STORAGE_KEY = 'open-tomato.auth.theme';

/** Light is the auth gateway's default; `?theme=dark` or the toggle flips it.
 *  Stamped as `data-theme` on <html> per the tokens.css contract. */
const initialTheme = (): ThemeName => {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('theme');
    if (fromQuery === 'dark' || fromQuery === 'light') return fromQuery;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore — fall back to light
  }
  return 'light';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // best-effort persistence
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((t) => (t === 'dark'
        ? 'light'
        : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
