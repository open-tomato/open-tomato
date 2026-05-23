import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';

const buildItems = (
  onProfileSelect?: (event: Event) => void,
): DropdownMenuItem[] => [
  { type: 'label', label: 'Account' },
  {
    type: 'item',
    value: 'profile',
    label: 'Profile',
    onSelect: onProfileSelect,
    leading: <svg data-testid="profile-leading" aria-hidden />,
  },
  { type: 'item', value: 'settings', label: 'Settings' },
  { type: 'separator' },
  {
    type: 'group',
    label: 'Workspace',
    items: [
      { type: 'item', value: 'invite', label: 'Invite user' },
      { type: 'item', value: 'team', label: 'Team', disabled: true },
    ],
  },
];

const renderDropdownMenu = (
  overrides: Partial<React.ComponentProps<typeof DropdownMenu>> = {},
) => render(
  <DropdownMenu
    trigger={<Button>Open menu</Button>}
    items={buildItems()}
    {...overrides}
  />,
);

describe('DropdownMenu', () => {
  it('renders the trigger and keeps Content unmounted until opened', () => {
    renderDropdownMenu();
    expect(screen.getByRole('button', { name: /Open menu/ })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the portaled Content on trigger click and renders one entry per descriptor branch', async () => {
    const user = userEvent.setup();
    renderDropdownMenu({ size: 'lg' });

    await user.click(screen.getByRole('button', { name: /Open menu/ }));

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('data-size', 'lg');

    // Item descriptor — selectable menuitem rows.
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Invite user')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();

    // Leading slot rendered raw inside an aria-hidden span.
    expect(screen.getByTestId('profile-leading')).toBeInTheDocument();

    // Label + group label descriptors — both render as Radix Label nodes.
    const labels = menu.querySelectorAll('[data-slot="dropdown-menu-label"], [data-slot="dropdown-menu-group-label"]');
    expect(labels).toHaveLength(2);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();

    // Separator descriptor.
    expect(menu.querySelector('[data-slot="dropdown-menu-separator"]')).not.toBeNull();

    // Group descriptor — Radix renders a role="group" element.
    expect(screen.getByRole('group')).toBeInTheDocument();

    // Disabled descriptor — Radix sets data-disabled on the item.
    const disabledItem = menu.querySelector('[data-value="team"]');
    expect(disabledItem).not.toBeNull();
    expect(disabledItem).toHaveAttribute('data-disabled');
  });

  it('propagates size, align, and side to the Content data-attributes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDropdownMenu({
      size: 'sm',
      align: 'end',
      side: 'right',
    });

    await user.click(screen.getByRole('button', { name: /Open menu/ }));
    let menu = await screen.findByRole('menu');
    expect(menu).toHaveAttribute('data-size', 'sm');
    expect(menu).toHaveAttribute('data-align', 'end');
    expect(menu).toHaveAttribute('data-side', 'right');

    rerender(
      <DropdownMenu
        open
        size="lg"
        align="start"
        side="top"
        trigger={<Button>Open menu</Button>}
        items={buildItems()}
      />,
    );

    menu = await screen.findByRole('menu');
    expect(menu).toHaveAttribute('data-size', 'lg');
    expect(menu).toHaveAttribute('data-align', 'start');
    expect(menu).toHaveAttribute('data-side', 'top');
  });

  it('fires the per-item onSelect when activated and forwards onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onProfileSelect = vi.fn<(event: Event) => void>();
    renderDropdownMenu({
      onOpenChange,
      items: buildItems(onProfileSelect),
    });

    await user.click(screen.getByRole('button', { name: /Open menu/ }));
    await screen.findByRole('menu');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('menuitem', { name: /^Profile$/ }));
    expect(onProfileSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('has no a11y violations when open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderDropdownMenu();

    await user.click(screen.getByRole('button', { name: /Open menu/ }));
    await screen.findByRole('menu');
    // role="menu" is not auto-exempted by axe's region rule (unlike role="dialog");
    // the consumer's app shell provides the landmark in real usage, so disable the
    // rule for this component-isolation scan. Documented in skills/component-testing.
    expect(await axe(document.body, {
      rules: { region: { enabled: false } },
    })).toHaveNoViolations();
  });
});
