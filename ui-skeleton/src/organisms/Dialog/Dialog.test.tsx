import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { Dialog } from './Dialog';

const renderDialog = (
  overrides: Partial<React.ComponentProps<typeof Dialog>> = {},
) => render(
  <Dialog
    trigger={<Button>Open dialog</Button>}
    title="Edit profile"
    description="Update the public information shown on your profile."
    {...overrides}
  >
    <p>Dialog body content</p>
  </Dialog>,
);

describe('Dialog', () => {
  it('renders the trigger and keeps Content unmounted until opened', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /Open dialog/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the portaled Content on trigger click and renders all slots', async () => {
    const user = userEvent.setup();
    renderDialog({
      size: 'lg',
      footer: <Button>Save changes</Button>,
    });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-size', 'lg');
    expect(dialog).toHaveAttribute('data-tone', 'neutral');

    expect(screen.getByText('Edit profile')).toBeInTheDocument();
    expect(screen.getByText('Update the public information shown on your profile.')).toBeInTheDocument();
    expect(screen.getByText('Dialog body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save changes$/ })).toBeInTheDocument();
  });

  it('propagates size and tone to the Content data-attributes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDialog({ size: 'sm', tone: 'info' });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'sm');
    expect(dialog).toHaveAttribute('data-tone', 'info');

    rerender(
      <Dialog
        open
        size="xl"
        tone="neutral"
        trigger={<Button>Open dialog</Button>}
        title="Resized dialog"
      >
        <p>Resized body</p>
      </Dialog>,
    );

    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-size', 'xl');
    expect(dialog).toHaveAttribute('data-tone', 'neutral');
  });

  it('fires onOpenChange when the dialog opens and when escape dismisses it', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    renderDialog({ onOpenChange });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    await screen.findByRole('dialog');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('renders the header override and keeps the title accessible via sr-only Radix Title', async () => {
    const user = userEvent.setup();
    renderDialog({
      header: <div data-testid="custom-header">Custom header layout</div>,
    });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();

    const title = dialog.querySelector('[data-slot="dialog-title"]');
    expect(title).not.toBeNull();
    expect(title).toHaveClass('sr-only');
    expect(title).toHaveTextContent('Edit profile');
  });

  it('renders without a description or footer when none are supplied', async () => {
    const user = userEvent.setup();
    renderDialog({ description: undefined });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-slot="dialog-description"]')).toBeNull();
    expect(dialog.querySelector('[data-slot="dialog-footer"]')).toBeNull();
  });

  it('has no a11y violations when open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    await screen.findByRole('dialog');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
