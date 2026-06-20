import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { NavigationMenu, type NavigationMenuItem } from './NavigationMenu';

const baseItems: NavigationMenuItem[] = [
  { type: 'link', label: 'Home', href: '/' },
  {
    type: 'menu',
    label: 'Products',
    content: <p data-testid="products-panel">Browse our product lineup.</p>,
  },
  { type: 'separator' },
  {
    type: 'link',
    label: 'Pricing',
    href: '/pricing',
    leading: <span data-testid="pricing-leading">$</span>,
  },
];

describe('NavigationMenu', () => {
  it('renders the nav landmark with resolved orientation data attributes and one node per descriptor branch', () => {
    const { container } = render(
      <NavigationMenu
        orientation="vertical"
        items={baseItems}
        aria-label="Primary"
      />,
    );

    const root = container.querySelector('[data-slot="navigation-menu-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-state', 'inactive');
    expect(root?.tagName).toBe('NAV');
    expect(root).toHaveAttribute('aria-label', 'Primary');

    // Link descriptor — Radix renders an <a> with implicit role="link".
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Pricing/ })).toHaveAttribute('href', '/pricing');
    // Optional leading slot renders raw inside the link.
    expect(screen.getByTestId('pricing-leading')).toBeInTheDocument();

    // Menu descriptor — Radix renders a <button> for the trigger.
    expect(screen.getByRole('button', { name: /Products/ })).toBeInTheDocument();

    // Separator descriptor — decorative, aria-hidden, role="separator".
    const separators = container.querySelectorAll('[data-slot="navigation-menu-separator"]');
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute('aria-hidden');
    expect(separators[0]).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('composes the Button atom for menu triggers and maps the open state via the variant lookup table', async () => {
    const user = userEvent.setup();
    render(<NavigationMenu items={baseItems} aria-label="Primary" />);

    const trigger = screen.getByRole('button', { name: /Products/ });
    // Idle menu maps to Button variant="ghost" via the lookup table.
    expect(trigger).toHaveAttribute('data-variant', 'ghost');
    expect(trigger).toHaveAttribute('data-size', 'md');

    await user.click(trigger);

    // Open menu remaps to Button variant="secondary" via the lookup table.
    expect(trigger).toHaveAttribute('data-variant', 'secondary');
  });

  it('propagates orientation to the Radix root, list slot, and separator cross-axis attribute', () => {
    const { container, rerender } = render(
      <NavigationMenu items={baseItems} aria-label="Primary" />,
    );

    const root = container.querySelector('[data-slot="navigation-menu-root"]');
    const list = container.querySelector('[data-slot="navigation-menu-list"]');
    const separator = container.querySelector('[data-slot="navigation-menu-separator"]');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(list).not.toBeNull();
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');

    rerender(
      <NavigationMenu
        orientation="vertical"
        items={baseItems}
        aria-label="Primary"
      />,
    );

    const rootAfter = container.querySelector('[data-slot="navigation-menu-root"]');
    const separatorAfter = container.querySelector('[data-slot="navigation-menu-separator"]');
    expect(rootAfter).toHaveAttribute('data-orientation', 'vertical');
    expect(separatorAfter).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('opens the projected Content on trigger click, mirrors the active value, and fires onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(next: string) => void>();
    render(
      <NavigationMenu
        items={baseItems}
        onValueChange={onValueChange}
        aria-label="Primary"
      />,
    );

    expect(screen.queryByTestId('products-panel')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /Products/ });
    await user.click(trigger);

    expect(onValueChange).toHaveBeenLastCalledWith('navigation-menu-item-1');
    expect(await screen.findByTestId('products-panel')).toBeInTheDocument();

    // Decorative chevron picks up data-open from the template's active state.
    const chevron = screen.getByTestId('products-panel')
      .closest('[data-slot="navigation-menu-root"]')
      ?.querySelector('[data-slot="navigation-menu-trigger-icon"]');
    expect(chevron).toHaveAttribute('data-open');
  });

  it('honours the controlled value prop and skips the internal state flip', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(next: string) => void>();
    const { rerender } = render(
      <NavigationMenu
        value=""
        items={baseItems}
        onValueChange={onValueChange}
        aria-label="Primary"
      />,
    );

    const trigger = screen.getByRole('button', { name: /Products/ });
    await user.click(trigger);

    expect(onValueChange).toHaveBeenLastCalledWith('navigation-menu-item-1');
    // Controlled — still inactive until the parent re-renders with the new value.
    expect(trigger).toHaveAttribute('data-variant', 'ghost');

    rerender(
      <NavigationMenu
        value="navigation-menu-item-1"
        items={baseItems}
        onValueChange={onValueChange}
        aria-label="Primary"
      />,
    );

    const triggerAfter = screen.getByRole('button', { name: /Products/ });
    expect(triggerAfter).toHaveAttribute('data-variant', 'secondary');
  });

  it('has no a11y violations (scans document.body for the viewport-projected Content)', async () => {
    const user = userEvent.setup();
    render(<NavigationMenu items={baseItems} aria-label="Primary" />);

    await user.click(screen.getByRole('button', { name: /Products/ }));
    await screen.findByTestId('products-panel');

    expect(await axe(document.body, {
      // The viewport's <div role="presentation"> wrapper is the standard Radix
      // shell — axe's region rule fires on the synthetic test page since the
      // consumer app shell normally provides the landmarks. Same rationale
      // documented for DropdownMenu / Menubar in skills/component-testing.
      rules: { region: { enabled: false } },
    })).toHaveNoViolations();
  });
});
