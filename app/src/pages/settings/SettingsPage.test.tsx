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

describe('SettingsPage', () => {
  test('renders the vertical sub-nav with the admin-only Integrations section', async () => {
    renderAt('/settings');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeTruthy();

    // Sub-nav sections (the current user is an owner → admin-gated
    // Integrations is visible). Profile is active so its label appears in
    // both the nav and the panel heading — assert via getAllByText.
    expect(screen.getAllByText('Your profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Members & groups')).toBeTruthy();
    expect(await screen.findByText('Integrations')).toBeTruthy();
  });

  test('deep-links the selected section from the URL splat', async () => {
    renderAt('/settings/members');

    // The Members section is the active panel (its title heads the stub).
    expect(
      await screen.findByRole('heading', { level: 4, name: 'Members & groups' }),
    ).toBeTruthy();
  });

  test('selecting a section navigates and swaps the placeholder panel', async () => {
    renderAt('/settings');
    await screen.findAllByText('Your profile');

    fireEvent.click(screen.getByText('Workspaces'));

    expect(
      await screen.findByRole('heading', { level: 4, name: 'Workspaces' }),
    ).toBeTruthy();
  });
});
