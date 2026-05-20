import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders a button with the accessible name', () => {
    render(<Toggle aria-label="Toggle bold">B</Toggle>);
    expect(screen.getByRole('button', { name: 'Toggle bold' })).toBeInTheDocument();
  });

  it('carries the toggle slot marker', () => {
    const { container } = render(<Toggle aria-label="x">B</Toggle>);
    expect(container.querySelector('[data-slot="toggle"]')).not.toBeNull();
  });

  it('defaults to variant=default and size=md', () => {
    render(<Toggle aria-label="x">B</Toggle>);
    const root = screen.getByRole('button', { name: 'x' });
    expect(root).toHaveAttribute('data-variant', 'default');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveClass('bg-transparent');
    expect(root).toHaveClass('h-9');
  });

  it('applies the outline variant class', () => {
    render(<Toggle aria-label="x" variant="outline">B</Toggle>);
    const root = screen.getByRole('button', { name: 'x' });
    expect(root).toHaveAttribute('data-variant', 'outline');
    expect(root).toHaveClass('border');
    expect(root).toHaveClass('border-input');
  });

  it('applies the size class for sm', () => {
    render(<Toggle aria-label="x" size="sm">B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('h-8');
  });

  it('applies the size class for lg', () => {
    render(<Toggle aria-label="x" size="lg">B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('h-10');
  });

  it('reflects pressed state via Radix data-state', () => {
    render(<Toggle aria-label="x" defaultPressed>B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveAttribute('data-state', 'on');
  });

  it('reflects unpressed state via Radix data-state', () => {
    render(<Toggle aria-label="x">B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveAttribute('data-state', 'off');
  });

  it('exposes aria-pressed for assistive tech', () => {
    render(<Toggle aria-label="x" defaultPressed>B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles pressed state on click and fires onPressedChange', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle aria-label="x" onPressedChange={onPressedChange}>B</Toggle>,
    );
    const root = screen.getByRole('button', { name: 'x' });
    await user.click(root);
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(root).toHaveAttribute('data-state', 'on');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Toggle aria-label="x" disabled>B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toBeDisabled();
  });

  it('forwards className to the root', () => {
    render(<Toggle aria-label="x" className="custom-toggle">B</Toggle>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('custom-toggle');
  });

  it('has no a11y violations (default)', async () => {
    const { container } = render(<Toggle aria-label="Toggle bold">B</Toggle>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations (pressed, outline, lg)', async () => {
    const { container } = render(
      <Toggle aria-label="Toggle italic" defaultPressed variant="outline" size="lg">I</Toggle>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
