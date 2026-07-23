import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '../../theme/ThemeProvider';

import { OverviewPage } from './OverviewPage';

const renderOverview = () => {
  const router = createMemoryRouter(
    [
      { path: '/', element: <OverviewPage /> },
      { path: '/sessions', element: <div>Sessions route stub</div> },
    ],
    { initialEntries: ['/'] },
  );
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

describe('OverviewPage', () => {
  test('renders every dashboard section with fixture data', async () => {
    renderOverview();

    // Head renders synchronously; section cards render once data loads.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeTruthy();
    expect(await screen.findByText('Monthly budget')).toBeTruthy();
    expect(screen.getByText('Tokens by model')).toBeTruthy();
    expect(screen.getByText('Tool calls')).toBeTruthy();
    expect(screen.getByText('Spend by agent')).toBeTruthy();
    expect(screen.getByText('When agents run')).toBeTruthy();
    expect(screen.getByText('Top 5 sessions by spend')).toBeTruthy();

    // Top sessions rendered by spend rank — unique session titles.
    expect(screen.getByText('flaky-e2e-hunt')).toBeTruthy();
    expect(screen.getByText('auth-refactor')).toBeTruthy();
  });

  test('time-range switch re-fetches and updates the figures', async () => {
    renderOverview();

    // Default range is 30 days.
    expect(await screen.findByText(/Daily totals · 30 days/)).toBeTruthy();

    // Switching to 7 days re-slices the series through the api.
    fireEvent.click(screen.getByText('7 days'));
    expect(await screen.findByText(/Daily totals · 7 days/)).toBeTruthy();
    expect(screen.queryByText(/Daily totals · 30 days/)).toBeNull();

    // "this year" switches to monthly buckets.
    fireEvent.click(screen.getByText('this year'));
    expect(await screen.findByText(/Monthly totals · 12 months/)).toBeTruthy();
  });

  test('"See all sessions" navigates to the sessions route', async () => {
    renderOverview();

    const link = await screen.findByRole('button', { name: /See all sessions/ });
    fireEvent.click(link);

    expect(await screen.findByText('Sessions route stub')).toBeTruthy();
  });
});
