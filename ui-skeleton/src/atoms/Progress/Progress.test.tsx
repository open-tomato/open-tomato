import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Progress } from './Progress';

describe('Progress', () => {
  it('renders a progressbar role', () => {
    render(<Progress value={40} aria-label="Loading" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('forwards value and max to the underlying primitive', () => {
    render(<Progress value={42} max={50} aria-label="Loading" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemax', '50');
  });

  it('defaults max to 100', () => {
    render(<Progress value={25} aria-label="Loading" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' }))
      .toHaveAttribute('aria-valuemax', '100');
  });

  it('exposes resolved variant + size as data attributes', () => {
    render(<Progress value={10} variant="success" size="lg" aria-label="Loading" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar).toHaveAttribute('data-variant', 'success');
    expect(bar).toHaveAttribute('data-size', 'lg');
  });

  it('applies the variant class for the success variant', () => {
    render(<Progress value={10} variant="success" aria-label="Loading" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' }))
      .toHaveClass('bg-emerald-100');
  });

  it('applies the size class for the lg size', () => {
    render(<Progress value={10} size="lg" aria-label="Loading" />);
    expect(screen.getByRole('progressbar', { name: 'Loading' }))
      .toHaveClass('h-4');
  });

  it('defaults to default variant + md size when omitted', () => {
    render(<Progress value={10} aria-label="Loading" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar).toHaveAttribute('data-variant', 'default');
    expect(bar).toHaveAttribute('data-size', 'md');
    expect(bar).toHaveClass('bg-secondary');
    expect(bar).toHaveClass('h-2.5');
  });

  it('renders an indicator slot translated by the inverse of the value percentage', () => {
    const { container } = render(<Progress value={40} aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveStyle({ transform: 'translateX(-60%)' });
  });

  it('clamps values above max', () => {
    const { container } = render(<Progress value={150} max={100} aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
  });

  it('treats null value as indeterminate (translateX(-100%))', () => {
    const { container } = render(<Progress value={null} aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('paints the indicator using the variant color', () => {
    const { container } = render(<Progress value={50} variant="destructive" aria-label="Loading" />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveClass('bg-destructive');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Progress value={60} aria-label="Loading" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
