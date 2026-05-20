import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a div with the skeleton data-slot', () => {
    render(<Skeleton data-testid="skel" />);
    const node = screen.getByTestId('skel');
    expect(node).toBeInTheDocument();
    expect(node.tagName).toBe('DIV');
    expect(node).toHaveAttribute('data-slot', 'skeleton');
  });

  it('applies the variant class for the circle shape', () => {
    render(<Skeleton variant="circle" data-testid="skel" />);
    const node = screen.getByTestId('skel');
    expect(node).toHaveClass('rounded-full');
    expect(node).toHaveClass('aspect-square');
  });

  it('applies the animate-wave class and gradient classes for the wave animation', () => {
    render(<Skeleton animate="wave" data-testid="skel" />);
    const node = screen.getByTestId('skel');
    expect(node).toHaveClass('animate-wave');
    expect(node).toHaveClass('bg-gradient-to-r');
  });

  it('exposes the resolved variant and animate via data attributes', () => {
    render(<Skeleton variant="text" animate="none" data-testid="skel" />);
    const node = screen.getByTestId('skel');
    expect(node).toHaveAttribute('data-variant', 'text');
    expect(node).toHaveAttribute('data-animate', 'none');
  });

  it('defaults to rect/pulse when variants are omitted', () => {
    render(<Skeleton data-testid="skel" />);
    const node = screen.getByTestId('skel');
    expect(node).toHaveAttribute('data-variant', 'rect');
    expect(node).toHaveAttribute('data-animate', 'pulse');
    expect(node).toHaveClass('rounded-md');
    expect(node).toHaveClass('animate-pulse');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
