import type { ThemePreference } from '../data';
import type { ThemeName } from '@open-tomato/ui-components';
import type { ReactNode } from 'react';

import { useEffect, useMemo, useState } from 'react';

import { api } from '../data';

import { ThemeContext, type ThemeContextValue } from './theme-context';

/**
 * Theme switching per the app-shell spec + the tokens.css contract:
 * light is the default, `data-theme="dark"` on <html> flips to dark, and
 * `prefers-color-scheme` is honored only when NO `data-theme` attribute
 * is set. So `system` preference means "remove the attribute and let the
 * OS drive"; the ThemeSwitcher is hidden in that mode.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>('light');
  const [theme, setTheme] = useState<ThemeName>('light');

  // Seed from the mock user's settings preference.
  useEffect(() => {
    let cancelled = false;
    void api.users.me().then((user) => {
      if (cancelled) return;
      setPreference(user.preferences.theme);
      if (user.preferences.theme !== 'system') {
        setTheme(user.preferences.theme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
      return;
    }
    root.setAttribute('data-theme', theme);
  }, [preference, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setTheme: (next: ThemeName) => {
        // A manual toggle is an explicit choice — leave `system` mode.
        setPreference(next);
        setTheme(next);
      },
      setPreference,
    }),
    [theme, preference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
