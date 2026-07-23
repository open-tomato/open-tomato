import type { ThemeName } from '@open-tomato/ui-components';

import { createContext, use } from 'react';

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const ctx = use(ThemeContext);
  if (ctx == null) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
