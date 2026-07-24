import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

import { appRoutes } from '../../routes/routes';
import { ThemeProvider } from '../../theme/ThemeProvider';

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

describe('NotificationsPage', () => {
  test('renders the table with a row per fixture notification', async () => {
    renderAt('/notifications');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notifications' }),
    ).toBeTruthy();

    expect(await screen.findByText('auth-refactor finished')).toBeTruthy();
    // Category badge label.
    expect(screen.getAllByText('session').length).toBeGreaterThan(0);
    // Trailing action link.
    expect(screen.getAllByRole('link', { name: /Open/ }).length).toBeGreaterThan(0);
  });

  test('a title-less notification falls back to its source on the first line', async () => {
    renderAt('/notifications');
    // ntf-003 carries an empty title and source "sentry-alerts" — the
    // double-line title falls back to the source, so "sentry-alerts" shows
    // both as the first line AND in the Source column (two matches).
    const matches = await screen.findAllByText('sentry-alerts');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
