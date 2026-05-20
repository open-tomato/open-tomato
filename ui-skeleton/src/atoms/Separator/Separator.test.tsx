import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Separator } from './Separator';

describe('Separator', () => {
  it('renders an element carrying the separator slot', () => {
    const { container } = render(<Separator />);
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull();
  });

  it('defaults to horizontal orientation', () => {
    const { container } = render(<Separator />);
    const root = container.querySelector('[data-slot="separator"]');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveClass('h-px');
    expect(root).toHaveClass('w-full');
  });

  it('applies vertical orientation classes', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const root = container.querySelector('[data-slot="separator"]');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveClass('h-full');
    expect(root).toHaveClass('w-px');
  });

  it('defaults to the default variant', () => {
    const { container } = render(<Separator />);
    const root = container.querySelector('[data-slot="separator"]');
    expect(root).toHaveAttribute('data-variant', 'default');
    expect(root).toHaveClass('bg-border');
  });

  it('applies the variant class for the strong variant', () => {
    const { container } = render(<Separator variant="strong" />);
    const root = container.querySelector('[data-slot="separator"]');
    expect(root).toHaveAttribute('data-variant', 'strong');
    expect(root).toHaveClass('bg-foreground/20');
  });

  it('applies the variant class for the subtle variant', () => {
    const { container } = render(<Separator variant="subtle" />);
    expect(container.querySelector('[data-slot="separator"]'))
      .toHaveClass('bg-border/50');
  });

  it('defaults to decorative (role="none", absent from a11y tree)', () => {
    const { container } = render(<Separator />);
    const root = container.querySelector('[data-slot="separator"]');
    expect(root).toHaveAttribute('role', 'none');
  });

  it('renders role="separator" when decorative={false}', () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('exposes aria-orientation on a non-decorative vertical separator', () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('omits aria-orientation on a non-decorative horizontal separator', () => {
    render(<Separator decorative={false} orientation="horizontal" />);
    expect(screen.getByRole('separator')).not.toHaveAttribute('aria-orientation');
  });

  it('forwards className to the root', () => {
    const { container } = render(<Separator className="custom-separator" />);
    expect(container.querySelector('[data-slot="separator"]'))
      .toHaveClass('custom-separator');
  });

  it('has no a11y violations (decorative default)', async () => {
    const { container } = render(<Separator />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations (semantic, vertical)', async () => {
    const { container } = render(<Separator decorative={false} orientation="vertical" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
