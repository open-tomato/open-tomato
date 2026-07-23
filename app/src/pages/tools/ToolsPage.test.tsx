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

describe('ToolsPage', () => {
  test('renders the filter row and a ToolCard per fixture tool', async () => {
    renderAt('/tools');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tools' }),
    ).toBeTruthy();

    expect(await screen.findByText('github-issues')).toBeTruthy();
    expect(screen.getByText('sentry-alerts')).toBeTruthy();

    // Type filter badges.
    expect(screen.getByText('MCP Server')).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
  });

  test('the type filter narrows the grid to one tool type', async () => {
    renderAt('/tools');
    await screen.findByText('github-issues');

    fireEvent.click(screen.getByText('Skills'));

    // repo-skills is a skill-set; github-issues (mcp) drops out.
    expect(screen.getByText('repo-skills')).toBeTruthy();
    expect(screen.queryByText('github-issues')).toBeNull();
  });

  test('Test Connection on a failing tool raises a persistent error toast', async () => {
    renderAt('/tools');
    await screen.findByText('sentry-alerts');

    // Open the failing tool's row menu (Radix opens on Enter) and choose
    // Test Connection.
    const trigger = screen.getByRole('button', { name: 'Actions for sentry-alerts' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const testItem = await screen.findByRole('menuitem', { name: /Test Connection/ });
    fireEvent.click(testItem);

    // After the connecting settle, the failure raises a persistent toast.
    expect(
      await screen.findByText(/Couldn't reach sentry-alerts/),
    ).toBeTruthy();
  });
});
