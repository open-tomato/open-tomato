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

describe('AgentsPage', () => {
  test('renders the filter row and an AgentCard per fixture agent', async () => {
    renderAt('/agents');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Agents' }),
    ).toBeTruthy();

    // Cards render agent names + their run counts.
    expect(await screen.findByText('planner')).toBeTruthy();
    expect(screen.getByText('debugger')).toBeTruthy();
    expect(screen.getByText('docs-gardener')).toBeTruthy();

    // Filter badges (with counts).
    expect(screen.getByText('enabled')).toBeTruthy();
    expect(screen.getByText('disabled')).toBeTruthy();
  });

  test('the disabled filter narrows to the off persona', async () => {
    renderAt('/agents');
    await screen.findByText('planner');

    fireEvent.click(screen.getByText('disabled'));

    // docs-gardener is the only disabled fixture agent.
    expect(screen.getByText('docs-gardener')).toBeTruthy();
    expect(screen.queryByText('planner')).toBeNull();
  });

  test('"New agent" opens the editor modal sub-route', async () => {
    renderAt('/agents');
    fireEvent.click(await screen.findByRole('button', { name: /New agent/ }));

    expect(await screen.findByText('Create a reusable persona')).toBeTruthy();
  });

  test('the Edit sub-route opens the editor prefilled for the agent', async () => {
    renderAt('/agents/agt-planner/edit');
    // Editor eyebrow + prefilled name (title) once the agent + options load.
    expect(await screen.findByText('Edit agent')).toBeTruthy();
    expect(await screen.findByText('Model')).toBeTruthy();
  });
});
