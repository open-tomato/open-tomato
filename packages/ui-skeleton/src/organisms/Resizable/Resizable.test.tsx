import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Resizable, type ResizableItem } from './Resizable';

const buildItems = (overrides: {
  withHandle?: boolean;
  disabled?: boolean;
} = {}): ResizableItem[] => [
  {
    type: 'panel',
    id: 'nav',
    defaultSize: 25,
    minSize: 10,
    content: <div data-testid="nav-content">Navigation</div>,
  },
  {
    type: 'handle',
    withHandle: overrides.withHandle,
    disabled: overrides.disabled,
  },
  {
    type: 'panel',
    id: 'main',
    defaultSize: 75,
    content: <div data-testid="main-content">Main</div>,
  },
];

describe('Resizable', () => {
  it('renders one panel / handle per descriptor with the resolved root data attributes', () => {
    const { container } = render(
      <Resizable direction="horizontal" items={buildItems()} />,
    );

    const root = container.querySelector('[data-slot="resizable-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-direction', 'horizontal');

    const panels = container.querySelectorAll('[data-slot="resizable-panel"]');
    expect(panels).toHaveLength(2);

    const handles = container.querySelectorAll('[data-slot="resizable-handle"]');
    expect(handles).toHaveLength(1);

    expect(screen.getByTestId('nav-content')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('composes the library role="separator" on each handle descriptor', () => {
    render(<Resizable items={buildItems()} />);

    const separators = screen.getAllByRole('separator');
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute('data-slot', 'resizable-handle');
  });

  it('propagates the direction axis to the underlying Group orientation and reflects it on the handle', () => {
    const { container } = render(
      <Resizable direction="vertical" items={buildItems()} />,
    );

    const root = container.querySelector('[data-slot="resizable-root"]');
    expect(root).toHaveAttribute('data-direction', 'vertical');

    const handle = container.querySelector('[data-slot="resizable-handle"]');
    expect(handle).toHaveAttribute('data-direction', 'vertical');

    // The library reflects orientation onto role="separator" via aria-orientation.
    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders the grip decoration when withHandle is true and omits it otherwise', () => {
    const { container, rerender } = render(
      <Resizable items={buildItems({ withHandle: false })} />,
    );
    expect(
      container.querySelector('[data-slot="resizable-handle-decoration"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="resizable-handle"]'),
    ).toHaveAttribute('data-with-handle', 'false');

    rerender(<Resizable items={buildItems({ withHandle: true })} />);
    expect(
      container.querySelector('[data-slot="resizable-handle-decoration"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="resizable-handle"]'),
    ).toHaveAttribute('data-with-handle', 'true');
  });

  it('reflects the disabled flag on the handle descriptor as data-disabled="true"', () => {
    const { container } = render(
      <Resizable items={buildItems({ disabled: true })} />,
    );
    expect(
      container.querySelector('[data-slot="resizable-handle"]'),
    ).toHaveAttribute('data-disabled', 'true');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Resizable items={buildItems({ withHandle: true })} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
