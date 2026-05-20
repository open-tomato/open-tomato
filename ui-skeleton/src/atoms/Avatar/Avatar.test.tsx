import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders the fallback content', () => {
    render(<Avatar fallback="MT" />);
    expect(screen.getByText('MT')).toBeInTheDocument();
  });

  it('applies the variant class for the lg size and square shape', () => {
    render(<Avatar size="lg" shape="square" fallback="MT" data-testid="avatar" />);
    const node = screen.getByTestId('avatar');
    expect(node).toHaveClass('size-12');
    expect(node).toHaveClass('rounded-md');
  });

  it('exposes the resolved size and shape via data attributes', () => {
    render(<Avatar size="xl" shape="circle" fallback="MT" data-testid="avatar" />);
    const node = screen.getByTestId('avatar');
    expect(node).toHaveAttribute('data-size', 'xl');
    expect(node).toHaveAttribute('data-shape', 'circle');
  });

  it('defaults to md/circle when variants are omitted', () => {
    render(<Avatar fallback="MT" data-testid="avatar" />);
    const node = screen.getByTestId('avatar');
    expect(node).toHaveAttribute('data-size', 'md');
    expect(node).toHaveAttribute('data-shape', 'circle');
    expect(node).toHaveClass('size-10');
    expect(node).toHaveClass('rounded-full');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Avatar src="/me.jpg" alt="Marcos" fallback="MT" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
