import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '../theme/ThemeProvider';

import { appRoutes } from './routes';

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

/** [path, expected placeholder heading] — spec URL patterns. */
const ROUTE_CASES: Array<[string, string]> = [
  ['/', 'Overview'],
  ['/sessions', 'Sessions'],
  ['/sessions/new', 'New Session'],
  ['/sessions/ses-001', 'Session'],
  ['/sessions/ses-001/fork', 'Fork Session'],
  ['/sessions/ses-001/export', 'Export Session'],
  ['/agents', 'Agents'],
  ['/agents/new', 'New Agent'],
  ['/agents/agt-planner/edit', 'Edit Agent'],
  ['/agents/agt-planner/clone', 'Clone Agent'],
  ['/tasks', 'Roadmap'],
  ['/tasks/tsk-001', 'Task'],
  ['/tools', 'Tools'],
  ['/tools/tol-github/export', 'Export Tool'],
  ['/settings', 'Settings'],
  ['/settings/profile', 'Settings'],
  ['/notifications', 'Notifications'],
  ['/search?q=tomato', 'Search results'],
  ['/workspace/ws-ripe-tomatoes', 'Overview'],
  ['/workspace/ws-ripe-tomatoes/sessions', 'Sessions'],
];

describe('route table', () => {
  test.each(ROUTE_CASES)(
    'renders the %s placeholder inside the shell',
    async (path, heading) => {
      renderAt(path);
      // Placeholder page heading…
      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeTruthy();
      // …inside the AppShell (sidebar nav landmark present).
      expect(
        screen.getByRole('navigation', { name: 'Main navigation' }),
      ).toBeTruthy();
    },
  );

  test('echoes route params on detail placeholders', async () => {
    renderAt('/sessions/ses-001/fork');
    expect(await screen.findByText('sessionId')).toBeTruthy();
    expect(screen.getByText('ses-001')).toBeTruthy();
  });

  test('multi-workspace base echoes the workspaceId param', async () => {
    renderAt('/workspace/ws-ripe-tomatoes/agents/agt-planner');
    expect(await screen.findByText('workspaceId')).toBeTruthy();
    expect(screen.getByText('ws-ripe-tomatoes')).toBeTruthy();
  });

  test('unknown paths fall through to the Not found placeholder', async () => {
    renderAt('/definitely-not-a-page');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not found' }),
    ).toBeTruthy();
  });
});
