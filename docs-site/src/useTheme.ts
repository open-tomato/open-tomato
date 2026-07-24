import { useEffect, useState } from 'react';

/** Mirrors `@open-tomato/ui-components`'s `ThemeName` (the type the portal
 *  Header's `theme` prop expects). ui-portal does not yet re-export it, so we
 *  restate the union locally — it is structurally identical (see OPT-257). */
export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'open-tomato.docs.theme';

const initialTheme = (): ThemeName => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore — fall back to light
  }
  return 'light';
};

export interface ThemeControls {
  theme: ThemeName;
  setTheme: (next: ThemeName) => void;
}

export const useTheme = (): ThemeControls => {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // best-effort persistence
    }
  }, [theme]);

  return { theme, setTheme };
};
