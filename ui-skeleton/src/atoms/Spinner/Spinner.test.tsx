import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders a div with the spinner data-slot', () => {
    render(<Spinner data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toBeInTheDocument();
    expect(node.tagName).toBe('DIV');
    expect(node).toHaveAttribute('data-slot', 'spinner');
  });

  it('always applies animate-spin and the rotating border classes', () => {
    render(<Spinner data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toHaveClass('animate-spin');
    expect(node).toHaveClass('border-current');
    expect(node).toHaveClass('border-t-transparent');
    expect(node).toHaveClass('rounded-full');
  });

  it('applies the variant class for the primary color', () => {
    render(<Spinner variant="primary" data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveClass('text-primary');
  });

  it('applies the size class for lg (size-8 and thicker border)', () => {
    render(<Spinner size="lg" data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toHaveClass('size-8');
    expect(node).toHaveClass('border-[3px]');
  });

  it('exposes the resolved variant and size via data attributes', () => {
    render(<Spinner variant="muted" size="sm" data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toHaveAttribute('data-variant', 'muted');
    expect(node).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to default/md when variants are omitted', () => {
    render(<Spinner data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toHaveAttribute('data-variant', 'default');
    expect(node).toHaveAttribute('data-size', 'md');
    expect(node).toHaveClass('text-foreground');
    expect(node).toHaveClass('size-6');
  });

  it('exposes a default role="status" + aria-label="Loading" + sr-only label', () => {
    render(<Spinner />);
    const node = screen.getByRole('status', { name: 'Loading' });
    expect(node).toHaveAttribute('aria-label', 'Loading');
    expect(node).not.toHaveAttribute('aria-hidden');
    expect(node.querySelector('span.sr-only')).toHaveTextContent('Loading');
  });

  it('uses the custom label for the accessible name and sr-only text', () => {
    render(<Spinner label="Saving changes" />);
    const node = screen.getByRole('status', { name: 'Saving changes' });
    expect(node).toHaveAttribute('aria-label', 'Saving changes');
    expect(node.querySelector('span.sr-only')).toHaveTextContent('Saving changes');
  });

  it('treats label="" as decorative (aria-hidden, no role, no sr-only)', () => {
    render(<Spinner label="" data-testid="spinner" />);
    const node = screen.getByTestId('spinner');
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node).not.toHaveAttribute('role');
    expect(node).not.toHaveAttribute('aria-label');
    expect(node.querySelector('span.sr-only')).toBeNull();
  });

  it('respects consumer overrides for role and aria-label', () => {
    render(
      <Spinner
        role="progressbar"
        aria-label="Uploading"
        data-testid="spinner"
      />,
    );
    const node = screen.getByTestId('spinner');
    expect(node).toHaveAttribute('role', 'progressbar');
    expect(node).toHaveAttribute('aria-label', 'Uploading');
  });

  it('has no a11y violations for the default labelled spinner', async () => {
    const { container } = render(<Spinner />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations for a decorative spinner inside a labelled wrapper', async () => {
    const { container } = render(
      <button type="button" aria-label="Saving">
        <Spinner label="" size="sm" />
      </button>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
