import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies the variant class for the destructive lg combination', () => {
    render(
      <Badge variant="destructive" size="lg" data-testid="badge">
        3
      </Badge>,
    );
    const node = screen.getByTestId('badge');
    expect(node).toHaveClass('bg-destructive');
    expect(node).toHaveClass('h-7');
  });

  it('exposes the resolved variant and size via data attributes', () => {
    render(
      <Badge variant="outline" size="sm" data-testid="badge">
        Beta
      </Badge>,
    );
    const node = screen.getByTestId('badge');
    expect(node).toHaveAttribute('data-variant', 'outline');
    expect(node).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to primary/md when variants are omitted', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const node = screen.getByTestId('badge');
    expect(node).toHaveAttribute('data-variant', 'primary');
    expect(node).toHaveAttribute('data-size', 'md');
    expect(node).toHaveClass('bg-primary');
    expect(node).toHaveClass('h-6');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Badge>Status</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
