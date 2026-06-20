import { act, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';

import { Sonner, toast } from './index';

const getToasterSection = () => document.querySelector('[data-sonner-toaster]');

describe('Sonner', () => {
  afterEach(() => {
    // sonner keeps a singleton toast queue across renders; dismiss everything
    // so the next test starts from a clean slate.
    act(() => {
      toast.dismiss();
    });
  });

  it('renders the Toaster host with the default position once a toast is queued', async () => {
    render(<Sonner />);

    // sonner lazy-mounts its <section data-sonner-toaster> the first time a
    // toast is fired — assert the queued path so the test reflects the real
    // mount flow.
    act(() => {
      toast('Mount the host.');
    });

    await screen.findByText('Mount the host.');
    const section = getToasterSection();
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute('data-y-position', 'bottom');
    expect(section).toHaveAttribute('data-x-position', 'right');
  });

  it('propagates the position axis to sonner data-{y,x}-position via direct passthrough', async () => {
    render(<Sonner position="top-center" />);

    act(() => {
      toast('Anchored.');
    });

    await screen.findByText('Anchored.');
    const section = getToasterSection();
    expect(section).toHaveAttribute('data-y-position', 'top');
    expect(section).toHaveAttribute('data-x-position', 'center');
  });

  it('propagates richColors to fired toasts (data-rich-colors on the toast element)', async () => {
    render(<Sonner richColors />);

    act(() => {
      toast.success('Saved.');
    });

    const toastElement = await screen.findByText('Saved.');
    const toastRoot = toastElement.closest('[data-sonner-toast]');
    expect(toastRoot).not.toBeNull();
    expect(toastRoot).toHaveAttribute('data-rich-colors', 'true');
    expect(toastRoot).toHaveAttribute('data-type', 'success');
  });

  it('renders the per-toast close button when closeButton is true', async () => {
    render(<Sonner closeButton />);

    act(() => {
      toast('Closeable.');
    });

    const toastElement = await screen.findByText('Closeable.');
    const toastRoot = toastElement.closest('[data-sonner-toast]');
    expect(toastRoot).not.toBeNull();
    expect(toastRoot?.querySelector('[data-close-button]')).not.toBeNull();
  });

  it('fires toasts through the re-exported `toast` helper without importing sonner directly', async () => {
    render(<Sonner />);

    act(() => {
      toast('Hello from the barrel');
    });

    expect(await screen.findByText('Hello from the barrel')).toBeInTheDocument();
  });

  it('has no a11y violations when a toast is visible (scans document.body)', async () => {
    render(<Sonner />);

    act(() => {
      toast('Accessible toast.');
    });

    await screen.findByText('Accessible toast.');

    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
