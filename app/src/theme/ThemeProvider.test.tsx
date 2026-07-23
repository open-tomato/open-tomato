import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useTheme } from './theme-context';
import { ThemeProvider } from './ThemeProvider';

const Probe = () => {
  const { theme, preference, setTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="state">{`${theme}:${preference}`}</span>
      <button type="button" onClick={() => setTheme('dark')}>go-dark</button>
      <button type="button" onClick={() => setPreference('system')}>
        go-system
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  test('seeds from the mock user preference and stamps data-theme', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(getByTestId('state').textContent).toBe('light:light');
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('toggling flips the data-theme attribute', async () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(getByTestId('state').textContent).toBe('light:light');
    });
    act(() => {
      getByText('go-dark').click();
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('system preference removes data-theme so the OS drives', async () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(getByTestId('state').textContent).toBe('light:light');
    });
    act(() => {
      getByText('go-system').click();
    });
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });
});
