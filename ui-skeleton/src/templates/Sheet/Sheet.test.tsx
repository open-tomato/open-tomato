import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { Sheet } from './Sheet';

const renderSheet = (
  overrides: Partial<React.ComponentProps<typeof Sheet>> = {},
) => render(
  <Sheet
    trigger={<Button>Open sheet</Button>}
    title="Settings"
    description="Configure your workspace preferences."
    {...overrides}
  >
    <p>Sheet body content</p>
  </Sheet>,
);

describe('Sheet', () => {
  it('renders the trigger and keeps Content unmounted until opened', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /Open sheet/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('composes the Dialog organism and renders all forwarded slots when opened', async () => {
    const user = userEvent.setup();
    renderSheet({
      side: 'right',
      size: 'lg',
      footer: <Button>Apply</Button>,
    });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Confirms Sheet delegates to the Dialog organism, not a generic <div>.
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content');

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your workspace preferences.')).toBeInTheDocument();
    expect(screen.getByText('Sheet body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Apply$/ })).toBeInTheDocument();
  });

  it('propagates side to the Content via contentProps data-side', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSheet({ side: 'left' });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'left');

    rerender(
      <Sheet
        open
        side="top"
        trigger={<Button>Open sheet</Button>}
        title="Top sheet"
      >
        <p>Top body</p>
      </Sheet>,
    );

    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'top');
  });

  it('propagates size 1:1 to the composed Dialog via the lookup table', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSheet({ size: 'sm', side: 'right' });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'sm');

    rerender(
      <Sheet
        open
        size="xl"
        side="right"
        trigger={<Button>Open sheet</Button>}
        title="Resized sheet"
      >
        <p>Resized body</p>
      </Sheet>,
    );

    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'xl');
  });

  it('projects side+size inline style onto the Dialog Content to override centered positioning', async () => {
    const user = userEvent.setup();
    renderSheet({ side: 'right', size: 'md' });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    const dialog = await screen.findByRole('dialog');

    // Right-anchored: right edge pinned, left auto, transform reset.
    expect(dialog.style.right).toBe('0px');
    expect(dialog.style.left).toBe('auto');
    expect(dialog.style.transform).toBe('translate(0, 0)');
    // Horizontal side takes size as a width.
    expect(dialog.style.width).toBe('20rem');
  });

  it('switches dimension axis for vertical sides (top/bottom take size as height)', async () => {
    const user = userEvent.setup();
    renderSheet({ side: 'bottom', size: 'lg' });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('data-side', 'bottom');
    expect(dialog.style.bottom).toBe('0px');
    expect(dialog.style.top).toBe('auto');
    // Vertical side takes size as a height.
    expect(dialog.style.height).toBe('20rem');
  });

  it('fires onOpenChange when the sheet opens and when escape dismisses it', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    renderSheet({ onOpenChange });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    await screen.findByRole('dialog');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('renders the header override and keeps the title accessible via sr-only Radix Title', async () => {
    const user = userEvent.setup();
    renderSheet({
      header: <div data-testid="custom-header">Custom header layout</div>,
    });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();

    const title = dialog.querySelector('[data-slot="dialog-title"]');
    expect(title).not.toBeNull();
    expect(title).toHaveClass('sr-only');
    expect(title).toHaveTextContent('Settings');
  });

  it('renders without a description or footer when none are supplied', async () => {
    const user = userEvent.setup();
    renderSheet({ description: undefined });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-slot="dialog-description"]')).toBeNull();
    expect(dialog.querySelector('[data-slot="dialog-footer"]')).toBeNull();
  });

  it('rejects consumer-supplied style and data-side via the public contentProps type (compile-time only)', async () => {
    // Sanity check that consumer contentProps still forwards non-overridden
    // properties — here a non-style attribute (aria-label) merges through
    // while the template's projected style stays intact. The Sheet
    // `contentProps` type Omits `style` and `data-side` so the merge cannot
    // accidentally undo the positioning at the type level.
    const user = userEvent.setup();
    renderSheet({
      side: 'left',
      contentProps: { 'aria-label': 'Settings panel' },
    });

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('aria-label', 'Settings panel');
    // Template-owned positioning still wins.
    expect(dialog.style.left).toBe('0px');
    expect(dialog.style.right).toBe('auto');
  });

  it('has no a11y violations when open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Open sheet/ }));
    await screen.findByRole('dialog');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
