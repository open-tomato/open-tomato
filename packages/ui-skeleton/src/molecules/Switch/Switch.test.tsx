import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

describe('Switch', () => {
  it('renders a native switch role with the resolved data attributes', () => {
    render(<Switch aria-label="Wi-Fi" size="lg" variant="success" />);
    const control = screen.getByRole('switch', { name: /Wi-Fi/ });
    expect(control).toBeInTheDocument();
    expect(control).toHaveAttribute('data-size', 'lg');
    expect(control).toHaveAttribute('data-variant', 'success');
  });

  it('exposes the switch-root and switch-label slots when a label is provided', () => {
    const { container } = render(<Switch label="Notifications" />);
    const root = container.querySelector('[data-slot="switch-root"]');
    const labelEl = container.querySelector('[data-slot="switch-label"]');
    expect(root).not.toBeNull();
    expect(labelEl).not.toBeNull();
    expect(labelEl).toHaveTextContent('Notifications');
  });

  it('toggles when the inline label is clicked (htmlFor/id pairing)', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('switch', { name: /Notifications/ });
    expect(control).toHaveAttribute('data-state', 'unchecked');

    await user.click(screen.getByText('Notifications'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(control).toHaveAttribute('data-state', 'checked');
  });

  it('respects the controlled checked prop without invoking onCheckedChange internally', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="Notifications"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    const control = screen.getByRole('switch', { name: /Notifications/ });
    expect(control).toHaveAttribute('data-state', 'unchecked');

    await user.click(control);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // Stays unchecked because the consumer owns the controlled value.
    expect(control).toHaveAttribute('data-state', 'unchecked');
  });

  it('has no a11y violations with or without an inline label', async () => {
    const withLabel = render(<Switch label="Notifications" />);
    expect(await axe(withLabel.container)).toHaveNoViolations();

    const ariaOnly = render(<Switch aria-label="Wi-Fi" />);
    expect(await axe(ariaOnly.container)).toHaveNoViolations();
  });
});
