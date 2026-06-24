type Theme = 'light' | 'dark';

export const THEME_COLORS: Record<Theme, string> = {
  light: 'var(--bg)',
  dark: 'var(--bg-dark)',
};

export function getThemeColor(theme: Theme) {
  return THEME_COLORS[theme];
}
export type { Theme };
