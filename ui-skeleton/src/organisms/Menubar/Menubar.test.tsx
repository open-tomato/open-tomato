import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Menubar, type MenubarItem } from './Menubar';

const buildItems = (
  onCopySelect?: (event: Event) => void,
): MenubarItem[] => [
  {
    type: 'menu',
    value: 'file',
    label: 'File',
    items: [
      { type: 'item', value: 'new', label: 'New' },
      { type: 'item', value: 'open', label: 'Open' },
      { type: 'separator' },
      { type: 'item', value: 'save', label: 'Save' },
    ],
  },
  {
    type: 'menu',
    value: 'edit',
    label: 'Edit',
    items: [
      { type: 'label', label: 'Clipboard' },
      {
        type: 'item',
        value: 'cut',
        label: 'Cut',
        leading: <svg data-testid="cut-leading" aria-hidden />,
      },
      { type: 'item', value: 'copy', label: 'Copy', onSelect: onCopySelect },
      {
        type: 'group',
        label: 'Recent',
        items: [
          { type: 'item', value: 'undo', label: 'Undo' },
          { type: 'item', value: 'redo', label: 'Redo', disabled: true },
        ],
      },
    ],
  },
  {
    type: 'menu',
    value: 'view',
    label: 'View',
    items: [
      { type: 'item', value: 'zoom-in', label: 'Zoom in' },
      { type: 'item', value: 'zoom-out', label: 'Zoom out' },
    ],
  },
];

const renderMenubar = (
  overrides: Partial<React.ComponentProps<typeof Menubar>> = {},
) => render(<Menubar items={buildItems()} {...overrides} />);

describe('Menubar', () => {
  it('renders one trigger per top-level menu and keeps all Content unmounted until opened', () => {
    renderMenubar({ size: 'lg', density: 'compact' });

    const root = screen.getByRole('menubar');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-density', 'compact');

    const triggers = screen.getAllByRole('menuitem');
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toHaveAttribute('data-value', 'file');
    expect(triggers[1]).toHaveAttribute('data-value', 'edit');
    expect(triggers[2]).toHaveAttribute('data-value', 'view');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the portaled Content on trigger click and renders one entry per descriptor branch', async () => {
    const user = userEvent.setup();
    renderMenubar({ size: 'lg', density: 'comfortable' });

    await user.click(screen.getByRole('menuitem', { name: /^Edit$/ }));

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('data-size', 'lg');
    expect(menu).toHaveAttribute('data-density', 'comfortable');
    expect(menu).toHaveAttribute('data-menu-value', 'edit');

    // Standalone label descriptor + group label descriptor — both rendered as Radix Label nodes.
    const labels = menu.querySelectorAll(
      '[data-slot="menubar-label"], [data-slot="menubar-group-label"]',
    );
    expect(labels).toHaveLength(2);
    expect(screen.getByText('Clipboard')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();

    // Item descriptors — selectable rows inside the opened Edit menu.
    expect(screen.getByRole('menuitem', { name: /^Cut$/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Copy$/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Undo$/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Redo$/ })).toBeInTheDocument();

    // Leading slot rendered raw inside an aria-hidden span.
    expect(screen.getByTestId('cut-leading')).toBeInTheDocument();

    // Group descriptor — Radix renders a role="group" element.
    expect(screen.getByRole('group')).toBeInTheDocument();

    // Separator descriptor in the File menu would render with data-slot — confirm Edit menu has none (no separator).
    expect(menu.querySelectorAll('[data-slot="menubar-separator"]')).toHaveLength(0);

    // Disabled descriptor — Radix sets data-disabled on the item.
    const disabledItem = menu.querySelector('[data-value="redo"]');
    expect(disabledItem).not.toBeNull();
    expect(disabledItem).toHaveAttribute('data-disabled');
  });

  it('navigates between top-level menu triggers with ArrowRight / ArrowLeft / Home / End', async () => {
    const user = userEvent.setup();
    renderMenubar();

    const triggers = screen.getAllByRole('menuitem');
    const fileTrigger = triggers[0]!;
    const editTrigger = triggers[1]!;
    const viewTrigger = triggers[2]!;

    fileTrigger.focus();
    expect(fileTrigger).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(editTrigger).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(viewTrigger).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(editTrigger).toHaveFocus();

    await user.keyboard('{End}');
    expect(viewTrigger).toHaveFocus();

    await user.keyboard('{Home}');
    expect(fileTrigger).toHaveFocus();
  });

  it('fires the per-item onSelect when an item is activated inside an opened menu', async () => {
    const user = userEvent.setup();
    const onCopySelect = vi.fn<(event: Event) => void>();
    const onValueChange = vi.fn<(value: string) => void>();

    render(
      <Menubar
        onValueChange={onValueChange}
        items={buildItems(onCopySelect)}
      />,
    );

    await user.click(screen.getByRole('menuitem', { name: /^Edit$/ }));
    await screen.findByRole('menu');
    expect(onValueChange).toHaveBeenLastCalledWith('edit');

    await user.click(screen.getByRole('menuitem', { name: /^Copy$/ }));
    expect(onCopySelect).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('has no a11y violations when a menu is open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderMenubar();

    await user.click(screen.getByRole('menuitem', { name: /^File$/ }));
    await screen.findByRole('menu');
    expect(await axe(document.body, {
      rules: { region: { enabled: false } },
    })).toHaveNoViolations();
  });
});
