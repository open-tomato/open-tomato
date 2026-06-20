import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders a textbox with the placeholder', () => {
    render(<Input placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('defaults type to text', () => {
    render(<Input aria-label="x" />);
    expect(screen.getByRole('textbox', { name: 'x' })).toHaveAttribute('type', 'text');
  });

  it('respects an explicit type attribute', () => {
    render(<Input aria-label="email" type="email" />);
    expect(screen.getByLabelText('email')).toHaveAttribute('type', 'email');
  });

  it('applies the variant class for the error variant on the root frame', () => {
    const { container } = render(<Input aria-label="x" variant="error" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveClass('border-destructive');
  });

  it('applies the size class for lg on the root frame', () => {
    const { container } = render(<Input aria-label="x" size="lg" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveClass('h-10');
  });

  it('exposes resolved variant, size, density, and tone via data attributes on the root', () => {
    const { container } = render(
      <Input aria-label="x" variant="success" size="sm" density="compact" tone="subtle" />,
    );
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveAttribute('data-variant', 'success');
    expect(root).toHaveAttribute('data-size', 'sm');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-tone', 'subtle');
  });

  it('defaults to default/md/comfortable/neutral when variants are omitted', () => {
    const { container } = render(<Input aria-label="x" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveAttribute('data-variant', 'default');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-density', 'comfortable');
    expect(root).toHaveAttribute('data-tone', 'neutral');
    expect(root).toHaveClass('border-input');
    expect(root).toHaveClass('h-9');
  });

  it('propagates density=compact to the root frame class', () => {
    const { container } = render(<Input aria-label="x" density="compact" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveClass('[&]:h-7');
    expect(root).toHaveClass('py-0');
  });

  it('propagates tone=subtle to the root frame class', () => {
    const { container } = render(<Input aria-label="x" tone="subtle" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveAttribute('data-tone', 'subtle');
    expect(root).toHaveClass('border-0');
    expect(root).toHaveClass('bg-muted/40');
  });

  it('propagates tone=inverted to the root frame class', () => {
    const { container } = render(<Input aria-label="x" tone="inverted" />);
    const root = container.querySelector('[data-slot="input-root"]');
    expect(root).toHaveAttribute('data-tone', 'inverted');
    expect(root).toHaveClass('bg-foreground');
    expect(root).toHaveClass('text-background');
  });

  it('automatically sets aria-invalid on the inner input when variant=error', () => {
    render(<Input aria-label="bad" variant="error" />);
    expect(screen.getByRole('textbox', { name: 'bad' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid for non-error variants', () => {
    render(<Input aria-label="ok" variant="success" />);
    expect(screen.getByRole('textbox', { name: 'ok' })).not.toHaveAttribute('aria-invalid');
  });

  it('honours an explicit aria-invalid override on error variant', () => {
    render(<Input aria-label="ok" variant="error" aria-invalid={false} />);
    expect(screen.getByRole('textbox', { name: 'ok' })).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders leading and trailing icon slots when provided', () => {
    const { container } = render(
      <Input
        aria-label="x"
        leadingIcon={<span data-testid="leading">L</span>}
        trailingIcon={<span data-testid="trailing">T</span>}
      />,
    );
    expect(container.querySelector('[data-slot="input-leading-icon"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="input-trailing-icon"]')).not.toBeNull();
    expect(screen.getByTestId('leading')).toBeInTheDocument();
    expect(screen.getByTestId('trailing')).toBeInTheDocument();
  });

  it('omits icon slot elements when icons are not provided', () => {
    const { container } = render(<Input aria-label="x" />);
    expect(container.querySelector('[data-slot="input-leading-icon"]')).toBeNull();
    expect(container.querySelector('[data-slot="input-trailing-icon"]')).toBeNull();
  });

  it('forwards ref to the inner input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input aria-label="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards disabled to the inner input', () => {
    render(<Input aria-label="x" disabled />);
    expect(screen.getByRole('textbox', { name: 'x' })).toBeDisabled();
  });

  it('accepts user keystrokes (controlled-like flow)', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="x" />);
    const input = screen.getByRole('textbox', { name: 'x' });
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <>
        <label htmlFor="email-input">Email</label>
        <Input id="email-input" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
