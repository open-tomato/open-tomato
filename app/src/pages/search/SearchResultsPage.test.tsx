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

describe('SearchResultsPage', () => {
  test('the ?q= param drives the header and the matched result rows', async () => {
    renderAt('/search?q=auth');

    // Header echoes the query.
    expect(await screen.findByRole('heading', { level: 1, name: /Results for/ })).toBeTruthy();

    // Cross-entity matches for "auth".
    expect(await screen.findByText('auth-refactor')).toBeTruthy();
    expect(screen.getByText('Auth middleware token contract v2')).toBeTruthy();
    // A doc result matches too.
    expect(screen.getByText('Authenticating agent sessions')).toBeTruthy();
  });

  test('a non-matching query shows the empty state', async () => {
    renderAt('/search?q=zzzznope');

    expect(await screen.findByText(/No matches for/)).toBeTruthy();
    expect(screen.queryByText('auth-refactor')).toBeNull();
  });
});
