import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Label } from './Label';

describe('Label', () => {
  it('renders its children as the label text', () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders a native <label> element', () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText('Email').closest('label')).not.toBeNull();
  });

  it('forwards htmlFor to the rendered label', () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText('Email').closest('label')).toHaveAttribute('for', 'email');
  });

  it('applies the variant class for the lg size', () => {
    render(<Label htmlFor="x" size="lg">Email</Label>);
    expect(screen.getByText('Email').closest('label')).toHaveClass('text-base');
  });

  it('exposes the resolved size via data attribute', () => {
    render(<Label htmlFor="x" size="sm">Email</Label>);
    expect(screen.getByText('Email').closest('label')).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to md when size is omitted', () => {
    render(<Label htmlFor="x">Email</Label>);
    const label = screen.getByText('Email').closest('label');
    expect(label).toHaveAttribute('data-size', 'md');
    expect(label).toHaveClass('text-sm');
  });

  it('does not render the required indicator when required is omitted', () => {
    const { container } = render(<Label htmlFor="x">Email</Label>);
    expect(container.querySelector('[data-slot="label-required-indicator"]')).toBeNull();
    expect(container.querySelector('label')).not.toHaveAttribute('data-required');
  });

  it('renders the required indicator when required is true', () => {
    const { container } = render(<Label htmlFor="x" required>Email</Label>);
    const indicator = container.querySelector('[data-slot="label-required-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveTextContent('*');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets data-required on the label when required', () => {
    render(<Label htmlFor="x" required>Email</Label>);
    expect(screen.getByText('Email').closest('label')).toHaveAttribute('data-required', '');
  });

  it('honors a custom requiredIndicator node', () => {
    const { container } = render(
      <Label htmlFor="x" required requiredIndicator={<span>(required)</span>}>
        Email
      </Label>,
    );
    const indicator = container.querySelector('[data-slot="label-required-indicator"]');
    expect(indicator).toHaveTextContent('(required)');
  });

  it('keeps the required marker out of the accessible name (aria-hidden)', () => {
    render(
      <>
        <Label htmlFor="email" required>Email</Label>
        <input id="email" aria-required />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations when required', async () => {
    const { container } = render(
      <>
        <Label htmlFor="email" required>Email</Label>
        <input id="email" required aria-required />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
