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

/**
 * [path, expected h1 heading] — spec URL patterns. The New/Fork/Export/Edit
 * modal sub-routes are asserted separately: an open Radix dialog marks the
 * background shell `aria-hidden`, so the list page's h1 + nav landmark are
 * no longer in the accessibility tree while the modal is up.
 */
const ROUTE_CASES: Array<[string, string | RegExp]> = [
  ['/', 'Overview'],
  ['/sessions', 'Sessions'],
  ['/agents', 'Agents'],
  ['/tasks', 'Roadmap'],
  ['/tools', 'Tools'],
  ['/settings', 'Settings'],
  ['/settings/profile', 'Settings'],
  ['/notifications', 'Notifications'],
  ['/search?q=tomato', /Results for/],
  ['/workspace/ws-ripe-tomatoes', 'Overview'],
  ['/workspace/ws-ripe-tomatoes/sessions', 'Sessions'],
  ['/workspace/ws-ripe-tomatoes/tasks', 'Roadmap'],
];

/** [path, modal title] — sub-routes that render a modal over their list. */
const MODAL_ROUTE_CASES: Array<[string, string | RegExp]> = [
  ['/sessions/new', 'Start a new session'],
  ['/sessions/ses-001/fork', 'Fork auth-refactor'],
  ['/sessions/ses-001/export', /auth-refactor\.jsonl/],
  ['/agents/new', 'Create a reusable persona'],
  ['/agents/agt-planner/edit', 'Edit agent'],
  ['/agents/agt-planner/clone', 'Clone agent'],
  ['/tasks/new', 'Add a roadmap task'],
  ['/tasks/tsk-001/edit', 'Edit task'],
  ['/tools/new', /Wire up something/],
  ['/tools/tol-github/edit', 'Edit tool'],
  ['/tools/tol-github/clone', 'Clone tool'],
];

describe('route table', () => {
  test.each(ROUTE_CASES)(
    'renders %s inside the shell',
    async (path, heading) => {
      renderAt(path);
      // Page heading…
      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeTruthy();
      // …inside the AppShell (sidebar nav landmark present).
      expect(
        screen.getByRole('navigation', { name: 'Main navigation' }),
      ).toBeTruthy();
    },
  );

  test.each(MODAL_ROUTE_CASES)(
    'renders the modal for %s',
    async (path, title) => {
      renderAt(path);
      expect(await screen.findByText(title)).toBeTruthy();
    },
  );

  test('the View Session route renders the session title (full page, no list)', async () => {
    renderAt('/sessions/ses-001');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'auth-refactor' }),
    ).toBeTruthy();
  });

  test('the Edit Task sub-route opens the form prefilled for the task', async () => {
    renderAt('/tasks/tsk-001/edit');
    // Eyebrow renders immediately; the danger-framed relations group lands
    // once the task + form options resolve.
    expect(await screen.findByText('Edit task')).toBeTruthy();
    expect(await screen.findByText('Blocking relations')).toBeTruthy();
  });

  test('unknown paths fall through to the Not found placeholder', async () => {
    renderAt('/definitely-not-a-page');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not found' }),
    ).toBeTruthy();
  });
});
