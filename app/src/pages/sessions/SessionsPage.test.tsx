import { fireEvent, render, screen } from '@testing-library/react';
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

describe('SessionsPage', () => {
  test('renders the stat row, filter pills and table rows from fixtures', async () => {
    renderAt('/sessions');

    // Head + stat row.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sessions' }),
    ).toBeTruthy();
    expect(screen.getByText('Live now')).toBeTruthy();

    // Table rows (session titles + resolved agent names from the fixtures).
    expect(await screen.findByText('auth-refactor')).toBeTruthy();
    expect(screen.getByText('perf-investigate')).toBeTruthy();
    expect(screen.getAllByText('planner').length).toBeGreaterThan(0);

    // Status quick-filter pills (the word also appears in status cells, so
    // there is at least one of each).
    expect(screen.getAllByText('running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0);
  });

  test('the text filter narrows the visible rows', async () => {
    renderAt('/sessions');
    await screen.findByText('auth-refactor');

    fireEvent.change(screen.getByLabelText('Filter sessions'), {
      target: { value: 'perf' },
    });

    expect(screen.getByText('perf-investigate')).toBeTruthy();
    expect(screen.queryByText('auth-refactor')).toBeNull();
  });

  test('"New session" opens the New Session modal sub-route', async () => {
    renderAt('/sessions');
    fireEvent.click(await screen.findByRole('button', { name: /New session/ }));

    // The /sessions/new modal renders over the list.
    expect(await screen.findByText('Start a new session')).toBeTruthy();
  });

  test('the Fork sub-route prefills the source session title', async () => {
    renderAt('/sessions/ses-001/fork');
    // Fork modal opens once the session detail loads (spec: fork prefill).
    expect(await screen.findByText('Fork auth-refactor')).toBeTruthy();
  });

  test('the View Session route renders the timeline-first detail', async () => {
    renderAt('/sessions/ses-001');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'auth-refactor' }),
    ).toBeTruthy();
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.getByText('Files touched')).toBeTruthy();
  });
});
