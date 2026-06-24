import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { AlertDialog } from './AlertDialog';

const renderAlertDialog = (
  overrides: Partial<React.ComponentProps<typeof AlertDialog>> = {},
) => render(
  <AlertDialog
    trigger={<Button>Open dialog</Button>}
    title="Are you sure?"
    description="This action cannot be undone."
    confirmAction={<Button>Confirm</Button>}
    cancelAction={<Button variant="outline">Cancel</Button>}
    {...overrides}
  />,
);

describe('AlertDialog', () => {
  it('renders the trigger and keeps Content unmounted until opened', () => {
    renderAlertDialog();
    expect(screen.getByRole('button', { name: /Open dialog/ })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens the portaled Content on trigger click and renders all slots', async () => {
    const user = userEvent.setup();
    renderAlertDialog({ size: 'lg' });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-size', 'lg');
    expect(dialog).toHaveAttribute('data-severity', 'info');

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Confirm$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/ })).toBeInTheDocument();
  });

  it('propagates severity to the confirm Button variant via the lookup table', async () => {
    const user = userEvent.setup();
    const { rerender } = renderAlertDialog({ severity: 'danger' });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    let confirm = await screen.findByRole('button', { name: /^Confirm$/ });
    expect(confirm).toHaveAttribute('data-variant', 'destructive');

    const cancel = screen.getByRole('button', { name: /^Cancel$/ });
    expect(cancel).toHaveAttribute('data-variant', 'outline');

    rerender(
      <AlertDialog
        open
        severity="warning"
        trigger={<Button>Open dialog</Button>}
        title="Heads up"
        description="Warning copy"
        confirmAction={<Button>Confirm</Button>}
        cancelAction={<Button variant="outline">Cancel</Button>}
      />,
    );

    confirm = await screen.findByRole('button', { name: /^Confirm$/ });
    expect(confirm).toHaveAttribute('data-variant', 'primary');
  });

  it('fires onOpenChange when the cancel action is activated', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    renderAlertDialog({ onOpenChange });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    await screen.findByRole('alertdialog');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: /^Cancel$/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('renders without a description when none is supplied', async () => {
    const user = userEvent.setup();
    renderAlertDialog({ description: undefined });

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.querySelector('[data-slot="alert-dialog-description"]')).toBeNull();
  });

  it('has no a11y violations when open (scans document.body for the portaled Content)', async () => {
    const user = userEvent.setup();
    renderAlertDialog();

    await user.click(screen.getByRole('button', { name: /Open dialog/ }));
    await screen.findByRole('alertdialog');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
