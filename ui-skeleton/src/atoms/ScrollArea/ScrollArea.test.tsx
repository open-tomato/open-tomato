import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { ScrollArea } from './ScrollArea';

describe('ScrollArea', () => {
  it('renders children inside the viewport', () => {
    render(
      <ScrollArea aria-label="Tag list">
        <div>Alpha</div>
        <div>Bravo</div>
      </ScrollArea>,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('exposes the resolved orientation as a data attribute on the root', () => {
    const { container } = render(
      <ScrollArea orientation="horizontal" aria-label="x">x</ScrollArea>,
    );
    const root = container.querySelector('[data-slot="scroll-area"]');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('defaults to vertical orientation when omitted', () => {
    const { container } = render(<ScrollArea aria-label="x">x</ScrollArea>);
    expect(container.querySelector('[data-slot="scroll-area"]'))
      .toHaveAttribute('data-orientation', 'vertical');
  });

  it('renders only a vertical scrollbar when orientation is vertical', () => {
    const { container } = render(
      <ScrollArea orientation="vertical" type="always" aria-label="x">x</ScrollArea>,
    );
    const scrollbars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
    expect(scrollbars).toHaveLength(1);
    expect(scrollbars[0]).toHaveAttribute('data-orientation', 'vertical');
  });

  it('renders only a horizontal scrollbar when orientation is horizontal', () => {
    const { container } = render(
      <ScrollArea orientation="horizontal" type="always" aria-label="x">x</ScrollArea>,
    );
    const scrollbars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
    expect(scrollbars).toHaveLength(1);
    expect(scrollbars[0]).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders both scrollbars when orientation is both', () => {
    const { container } = render(
      <ScrollArea orientation="both" type="always" aria-label="x">x</ScrollArea>,
    );
    const scrollbars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
    expect(scrollbars).toHaveLength(2);
    const orientations = Array.from(scrollbars).map((el) => el.getAttribute('data-orientation'));
    expect(orientations).toContain('vertical');
    expect(orientations).toContain('horizontal');
  });

  it('never renders a corner when only one orientation is requested', () => {
    const { container } = render(
      <ScrollArea orientation="vertical" type="always" aria-label="x">x</ScrollArea>,
    );
    // The wrapper never emits the corner unless orientation is both; Radix
    // gates the actual DOM mount of the corner on layout state, which jsdom
    // can't compute, so we assert only the wrapper-controlled branch here.
    expect(container.querySelector('[data-slot="scroll-area-corner"]')).toBeNull();
  });

  it('applies the orientation-specific scrollbar class', () => {
    const { container } = render(
      <ScrollArea orientation="horizontal" type="always" aria-label="x">x</ScrollArea>,
    );
    const scrollbar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
    expect(scrollbar).toHaveClass('h-2.5');
  });

  it('renders a viewport slot containing the children', () => {
    const { container } = render(
      <ScrollArea aria-label="x">
        <span>inner</span>
      </ScrollArea>,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).not.toBeNull();
    expect(viewport?.textContent).toContain('inner');
  });

  it('forwards className to the root and viewportProps.className to the viewport', () => {
    const { container } = render(
      <ScrollArea
        aria-label="x"
        className="custom-root"
        viewportProps={{ className: 'custom-viewport' }}
      >
        x
      </ScrollArea>,
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass('custom-root');
    expect(container.querySelector('[data-slot="scroll-area-viewport"]'))
      .toHaveClass('custom-viewport');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <ScrollArea aria-label="Tag list">
        <ul>
          <li>Alpha</li>
          <li>Bravo</li>
        </ul>
      </ScrollArea>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
