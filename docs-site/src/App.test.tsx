import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { FIRST_PAGE } from './content';
import { links } from './links';

const renderApp = async () => {
  await act(async () => {
    render(<App />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('docs site App', () => {
  it('lands on the first doc page and renders its title', async () => {
    await renderApp();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings.some((h) => h.textContent === FIRST_PAGE.title)).toBe(true);
  });

  it('renders the category sidebar nav', async () => {
    await renderApp();
    for (const label of ['Concepts', 'API Reference', 'Examples']) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders markdown body content from the aggregated source', async () => {
    await renderApp();
    // The generated introduction page carries README prose (the heading also
    // appears in the TOC rail, so more than one match is expected).
    expect(screen.getAllByText(/Name conventions/i).length).toBeGreaterThanOrEqual(1);
  });

  it('exposes the dashboard CTA pointing at the auth app', async () => {
    await renderApp();
    const cta = screen.getAllByRole('link', { name: /^dashboard$/i });
    expect(cta.some((a) => a.getAttribute('href') === links.auth)).toBe(true);
  });
});
