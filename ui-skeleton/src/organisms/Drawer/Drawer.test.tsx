import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { Drawer } from './Drawer';

const renderDrawer = (
  overrides: Partial<React.ComponentProps<typeof Drawer>> = {},
) => render(
  <Drawer
    trigger={<Button>Open drawer</Button>}
    title="Settings"
    description="Configure your workspace preferences."
    {...overrides}
  >
    <p>Drawer body content</p>
  </Drawer>,
);

describe('Drawer', () => {
  it('renders the trigger and keeps Content unmounted until opened', () => {
    renderDrawer();
    expect(screen.getByRole('button', { name: /Open drawer/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the portaled Content on trigger click and renders all slots', async () => {
    const user = userEvent.setup();
    renderDrawer({
      side: 'bottom',
      size: 'lg',
      footer: <Button>Apply</Button>,
    });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-side', 'bottom');
    expect(dialog).toHaveAttribute('data-size', 'lg');

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your workspace preferences.')).toBeInTheDocument();
    expect(screen.getByText('Drawer body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Apply$/ })).toBeInTheDocument();
    expect(dialog.querySelector('[data-slot="drawer-handle"]')).not.toBeNull();
  });

  it('omits the gesture handle for horizontal sides', async () => {
    const user = userEvent.setup();
    renderDrawer({ side: 'right' });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'right');
    expect(dialog.querySelector('[data-slot="drawer-handle"]')).toBeNull();
  });

  it('propagates side to the Content data-side attribute via the lookup table', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer({ side: 'left' });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'left');

    rerender(
      <Drawer
        open
        side="top"
        trigger={<Button>Open drawer</Button>}
        title="Top drawer"
      >
        <p>Top body</p>
      </Drawer>,
    );

    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'top');
  });

  it('fires onOpenChange when the drawer opens', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    renderDrawer({ onOpenChange });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    await screen.findByRole('dialog');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('renders the header override and keeps the title accessible via sr-only Vaul.Title', async () => {
    const user = userEvent.setup();
    renderDrawer({
      header: <div data-testid="custom-header">Custom header layout</div>,
    });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();

    const title = dialog.querySelector('[data-slot="drawer-title"]');
    expect(title).not.toBeNull();
    expect(title).toHaveClass('sr-only');
    expect(title).toHaveTextContent('Settings');
  });

  it('renders without a description when none is supplied', async () => {
    const user = userEvent.setup();
    renderDrawer({ description: undefined });

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-slot="drawer-description"]')).toBeNull();
  });

  it('has no a11y violations when open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: /Open drawer/ }));
    await screen.findByRole('dialog');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
