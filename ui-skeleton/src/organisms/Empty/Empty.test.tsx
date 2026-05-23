import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Empty } from './Empty';

describe('Empty', () => {
  it('renders leading, title, description, and actions slots', () => {
    render(
      <Empty
        leading={<span data-testid="leading-icon">i</span>}
        title="No messages yet"
        description="Conversations will appear here once they arrive."
        actions={<button type="button">Refresh</button>}
      />,
    );
    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(
      screen.getByText('Conversations will appear here once they arrive.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('composes the underlying Card via data-slot=empty-root', () => {
    const { container } = render(<Empty title="Nothing yet" />);
    const root = container.querySelector('[data-slot="empty-root"]');
    expect(root).not.toBeNull();
    // The same element carries the Card atom's own data attribute.
    expect(root).toHaveAttribute('data-variant', 'default');
  });

  it('propagates size to the composed Card padding and Typography variant', () => {
    const { container } = render(
      <Empty size="lg" title="Nothing yet" description="Detail" />,
    );
    const root = container.querySelector('[data-slot="empty-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-padding', 'lg');
    expect(screen.getByText('Nothing yet')).toHaveAttribute('data-variant', 'h3');
  });

  it('reflects tone via data-tone on the root', () => {
    const { container } = render(<Empty tone="info" title="Heads up" />);
    expect(container.querySelector('[data-slot="empty-root"]')).toHaveAttribute(
      'data-tone',
      'info',
    );
  });

  it('omits optional slot wrappers when their slot props are not provided', () => {
    const { container } = render(<Empty title="Only the title" />);
    expect(container.querySelector('[data-slot="empty-leading"]')).toBeNull();
    expect(container.querySelector('[data-slot="empty-actions"]')).toBeNull();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Empty
        leading={<span aria-hidden>i</span>}
        title="No messages yet"
        description="Conversations will appear here once they arrive."
        actions={<button type="button">Refresh</button>}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
