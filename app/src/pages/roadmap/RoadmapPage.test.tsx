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

describe('RoadmapPage', () => {
  test('renders the toolbar and a table row per fixture task', async () => {
    renderAt('/tasks');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Roadmap' }),
    ).toBeTruthy();

    // task-cell titles.
    expect(await screen.findByText('Auth middleware token contract v2')).toBeTruthy();
    expect(screen.getByText('Export usage report as CSV')).toBeTruthy();

    // Owner handle resolved from the member roster (user-inline column).
    expect(screen.getAllByText('jess').length).toBeGreaterThan(0);

    // Status filter Select present.
    expect(screen.getByLabelText('Filter by status')).toBeTruthy();
  });

  test('the search box narrows the table to matching tasks', async () => {
    renderAt('/tasks');
    await screen.findByText('Auth middleware token contract v2');

    fireEvent.change(screen.getByLabelText('Search tasks'), {
      target: { value: 'settings' },
    });

    expect(screen.getByText('Settings shell with vertical sub-nav')).toBeTruthy();
    expect(screen.queryByText('Auth middleware token contract v2')).toBeNull();
  });

  test('"New task" opens the task form modal sub-route', async () => {
    renderAt('/tasks');
    fireEvent.click(await screen.findByRole('button', { name: /New task/ }));

    expect(await screen.findByText('Add a roadmap task')).toBeTruthy();
  });
});
