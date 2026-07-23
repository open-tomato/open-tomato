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

  test('the editor tool selection stays model-consistent for a non-code model', async () => {
    // docs-gardener runs haiku-4-5 (caps: chat, web) — no `code` cap, so the
    // default selection must derive from the model's allowed groups, not a
    // fixed code-tool seed. Regression guard for the review MEDIUM.
    renderAt('/agents/agt-docs/edit');
    expect(await screen.findByText('Edit agent')).toBeTruthy();
    expect(await screen.findByText('claude-haiku-4-5')).toBeTruthy();

    // Every tool toggle is a role="switch"; the selected ones are checked.
    const toggles = await screen.findAllByRole('switch');
    const checked = toggles.filter((t) => t.getAttribute('aria-checked') === 'true');

    // Footer "N tools" count == the number of checked toggles.
    const footer = screen.getByText(/tools? · fast ·/);
    const footerCount = Number(/(\d+) tool/.exec(footer.textContent ?? '')?.[1]);
    expect(footerCount).toBe(checked.length);

    // The selection is non-empty and lives in the model's allowed groups…
    expect(checked.length).toBeGreaterThan(0);
    expect(screen.getByRole('switch', { name: /chat\.summarize/ })).toBeTruthy();
    // …and a code-cap tool the model doesn't allow is not even rendered.
    expect(screen.queryByRole('switch', { name: /shell/ })).toBeNull();
  });
});
