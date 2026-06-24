import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('applies the variant class for the destructive lg combination', () => {
    render(
      <Button variant="destructive" size="lg">
        Delete
      </Button>,
    );
    const node = screen.getByRole('button', { name: 'Delete' });
    expect(node).toHaveClass('bg-destructive');
    expect(node).toHaveClass('h-10');
  });

  it('exposes the resolved variant and size via data attributes', () => {
    render(
      <Button variant="outline" size="sm">
        Cancel
      </Button>,
    );
    const node = screen.getByRole('button', { name: 'Cancel' });
    expect(node).toHaveAttribute('data-variant', 'outline');
    expect(node).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to primary/md when variants are omitted', () => {
    render(<Button>Default</Button>);
    const node = screen.getByRole('button', { name: 'Default' });
    expect(node).toHaveAttribute('data-variant', 'primary');
    expect(node).toHaveAttribute('data-size', 'md');
    expect(node).toHaveClass('bg-primary');
    expect(node).toHaveClass('h-9');
  });

  it('defaults type to button to avoid accidental form submits', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('disables interaction and exposes data-loading when loading', () => {
    render(<Button loading>Saving</Button>);
    const node = screen.getByRole('button', { name: 'Saving' });
    expect(node).toBeDisabled();
    expect(node).toHaveAttribute('data-loading', '');
    expect(node).toHaveAttribute('aria-busy', 'true');
  });

  it('renders leading and trailing icons alongside children', () => {
    render(
      <Button
        leadingIcon={<span data-testid="leading">L</span>}
        trailingIcon={<span data-testid="trailing">T</span>}
      >
        Send
      </Button>,
    );
    expect(screen.getByTestId('leading')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByTestId('trailing')).toBeInTheDocument();
  });

  it('renders as the supplied child element when asChild is set', () => {
    render(
      <Button asChild variant="ghost">
        <a href="/home">Home</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/home');
    expect(link).toHaveClass('hover:bg-accent');
    expect(link).toHaveAttribute('data-variant', 'ghost');
  });

  it('renders icons alongside the merged child when asChild is set (Slottable)', () => {
    render(
      <Button asChild leadingIcon={<span data-testid="leading">L</span>}>
        <a href="/go">Go</a>
      </Button>,
    );
    expect(screen.getByTestId('leading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go/ })).toHaveAttribute('href', '/go');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Button>Accessible</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
