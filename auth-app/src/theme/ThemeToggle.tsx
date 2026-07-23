import { Icon, IconButton } from '@open-tomato/ui-components';

import { useTheme } from './theme-context';

/**
 * Floating light/dark toggle. The standalone auth gateway has no app chrome to
 * host a theme switch, so it sits fixed in the corner — enough to verify both
 * themes render intentionally (the real deployment inherits the OS preference).
 */
export const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <IconButton
        onClick={toggle}
        label={theme === 'dark'
          ? 'Switch to light theme'
          : 'Switch to dark theme'}
        icon={<Icon name={theme === 'dark'
          ? 'sun'
          : 'moon'} size={16} />}
      />
    </div>
  );
};
