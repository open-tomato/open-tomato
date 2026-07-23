import type { ThemePreference } from '../data';
import type { ThemeName } from '@open-tomato/ui-components';

import { createContext, useContext } from 'react';

export interface ThemeContextValue {
  /** Resolved theme driving `data-theme`; meaningless under `system`. */
  theme: ThemeName;
  /** The user's settings preference; `system` hides the switcher. */
  preference: ThemePreference;
  setTheme: (next: ThemeName) => void;
  setPreference: (next: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (value == null) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return value;
};
