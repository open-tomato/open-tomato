import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Item } from './Item';

describe('Item', () => {
  it('renders leading, title, description, and trailing slots', () => {
    render(
      <Item
        leading={<span data-testid="leading-icon">L</span>}
        title="Settings"
        description="Configure your account"
        trailing={<span data-testid="trailing-chevron">›</span>}
      />,
    );
    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your account')).toBeInTheDocument();
    expect(screen.getByTestId('trailing-chevron')).toBeInTheDocument();
  });

  it('renders as a div by default with item-root slot attribute', () => {
    render(<Item title="Default row" />);
    const root = screen.getByText('Default row').closest('[data-slot="item-root"]');
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('DIV');
    expect(root).toHaveAttribute('data-as', 'div');
  });

  it('propagates size to the composed Typography title variant and weight', () => {
    render(
      <Item size="lg" title="Heads up" description="Detail">
        body
      </Item>,
    );
    const title = screen.getByText('Heads up');
    expect(title).toHaveAttribute('data-variant', 'h4');

    const description = screen.getByText('Detail');
    expect(description).toHaveAttribute('data-variant', 'caption');
  });

  it('propagates a smaller size to body title variant with medium weight', () => {
    render(<Item size="sm" title="Compact" />);
    const title = screen.getByText('Compact');
    expect(title).toHaveAttribute('data-variant', 'body');
  });

  it('renders polymorphically as a button with type="button" and exposes data-as', () => {
    render(
      <Item as="button" interactive title="Sign in" />,
    );
    const root = screen.getByRole('button', { name: 'Sign in' });
    expect(root.tagName).toBe('BUTTON');
    expect(root).toHaveAttribute('type', 'button');
    expect(root).toHaveAttribute('data-as', 'button');
    expect(root).toHaveAttribute('data-interactive', '');
  });

  it('renders polymorphically as an anchor with href', () => {
    render(
      <Item as="a" href="/profile" interactive title="Profile" />,
    );
    const root = screen.getByRole('link', { name: 'Profile' });
    expect(root.tagName).toBe('A');
    expect(root).toHaveAttribute('href', '/profile');
    expect(root).toHaveAttribute('data-as', 'a');
  });

  it('renders polymorphically as a list item inside a ul', () => {
    render(
      <ul>
        <Item as="li" title="First" />
        <Item as="li" title="Second" />
      </ul>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('data-as', 'li');
  });

  it('omits data-interactive when not interactive', () => {
    render(<Item title="Inert" />);
    const root = screen.getByText('Inert').closest('[data-slot="item-root"]');
    expect(root).not.toHaveAttribute('data-interactive');
  });

  it('omits data-active by default', () => {
    render(<Item title="Default" />);
    const root = screen.getByText('Default').closest('[data-slot="item-root"]');
    expect(root).not.toHaveAttribute('data-active');
  });

  it('stamps data-active="" and applies active token classes when active', () => {
    render(<Item title="Selected" active />);
    const root = screen.getByText('Selected').closest('[data-slot="item-root"]');
    expect(root).toHaveAttribute('data-active', '');
    expect(root).toHaveClass('bg-accent');
    expect(root).toHaveClass('text-accent-foreground');
  });

  it('applies muted text class for inactive rows', () => {
    render(<Item title="Quiet" />);
    const root = screen.getByText('Quiet').closest('[data-slot="item-root"]');
    expect(root).toHaveClass('text-muted-foreground');
  });

  it('composes active + interactive + as="button" into a nav-row shape', () => {
    render(
      <Item
        as="button"
        interactive
        active
        leading={<span data-testid="nav-icon" aria-hidden>★</span>}
        title="Dashboard"
      />,
    );
    const root = screen.getByRole('button', { name: 'Dashboard' });
    expect(root.tagName).toBe('BUTTON');
    expect(root).toHaveAttribute('data-active', '');
    expect(root).toHaveAttribute('data-interactive', '');
    expect(root).toHaveClass('bg-accent');
    expect(root).toHaveClass('cursor-pointer');
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument();
  });

  it('has no a11y violations as an active nav-row button', async () => {
    const { container } = render(
      <Item as="button" interactive active title="Dashboard" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations as a non-interactive div', async () => {
    const { container } = render(
      <Item leading={<span>L</span>} title="Settings" description="Configure" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations as an interactive button', async () => {
    const { container } = render(
      <Item as="button" interactive title="Sign in" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
