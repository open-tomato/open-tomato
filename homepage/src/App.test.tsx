import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { links } from './links';

/** Render and let the FeatureGrid's lazy-loaded lucide icons settle inside
 *  act(), so their dynamic-import resolution doesn't warn after teardown. */
const renderApp = async () => {
  await act(async () => {
    render(<App />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('homepage App', () => {
  it('renders the marketing hero heading', async () => {
    await renderApp();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('exposes the primary sign-in CTA pointing at the auth app', async () => {
    await renderApp();
    const signIn = screen.getAllByRole('link', { name: /sign in/i });
    expect(signIn.some((a) => a.getAttribute('href') === links.auth)).toBe(true);
  });

  it('links out to the source repository', async () => {
    await renderApp();
    const gh = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === links.github);
    expect(gh.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the landing sections with anchor ids for in-page nav', async () => {
    await renderApp();
    for (const id of ['home', 'quickstart', 'features', 'community']) {
      expect(document.querySelector(`#${id}`)).not.toBeNull();
    }
  });
});
