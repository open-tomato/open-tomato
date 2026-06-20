import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { ToggleGroup } from './ToggleGroup';

const items = [
  { value: 'left', label: 'Left', ariaLabel: 'Align left' },
  { value: 'center', label: 'Center', ariaLabel: 'Align center' },
  { value: 'right', label: 'Right', ariaLabel: 'Align right', disabled: true },
];

describe('ToggleGroup', () => {
  it('renders one Toggle per item with the resolved root data attributes', () => {
    const { container } = render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        size="lg"
        variant="outline"
        orientation="horizontal"
        items={items}
      />,
    );
    const toggles = container.querySelectorAll('[data-slot="toggle"]');
    expect(toggles).toHaveLength(3);

    const root = container.querySelector('[data-slot="toggle-group"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-variant', 'outline');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('propagates variant and size to every composed Toggle atom', () => {
    const { container } = render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        size="sm"
        variant="outline"
        items={items}
      />,
    );
    const toggles = container.querySelectorAll('[data-slot="toggle"]');
    expect(toggles).toHaveLength(3);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute('data-variant', 'outline');
      expect(toggle).toHaveAttribute('data-size', 'sm');
    }
  });

  it('exposes per-item aria-label via the ariaLabel descriptor field', () => {
    render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        items={items}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Align left' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Align center' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Align right' })).toBeInTheDocument();
  });

  it('honours the disabled flag on individual items', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        items={items}
        onValueChange={onValueChange}
      />,
    );
    const disabled = screen.getByRole('radio', { name: 'Align right' });
    expect(disabled).toBeDisabled();
    await user.click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('fires onValueChange with the selected string in single mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        items={items}
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole('radio', { name: 'Align center' }));
    expect(onValueChange).toHaveBeenCalledWith('center');
    expect(screen.getByRole('radio', { name: 'Align center' })).toHaveAttribute(
      'data-state',
      'on',
    );
  });

  it('fires onValueChange with an array of strings in multiple mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        type="multiple"
        aria-label="Style"
        items={[
          { value: 'bold', label: 'B', ariaLabel: 'Bold' },
          { value: 'italic', label: 'I', ariaLabel: 'Italic' },
        ]}
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    expect(onValueChange).toHaveBeenNthCalledWith(1, ['bold']);
    expect(onValueChange).toHaveBeenNthCalledWith(2, ['bold', 'italic']);
  });

  it('respects controlled value without flipping state internally', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        value="left"
        items={items}
        onValueChange={onValueChange}
      />,
    );
    const left = screen.getByRole('radio', { name: 'Align left' });
    const center = screen.getByRole('radio', { name: 'Align center' });
    expect(left).toHaveAttribute('data-state', 'on');
    expect(center).toHaveAttribute('data-state', 'off');

    await user.click(center);
    expect(onValueChange).toHaveBeenCalledWith('center');
    expect(left).toHaveAttribute('data-state', 'on');
    expect(center).toHaveAttribute('data-state', 'off');
  });

  it('has no a11y violations with per-item aria-label', async () => {
    const { container } = render(
      <ToggleGroup
        type="single"
        aria-label="Alignment"
        defaultValue="left"
        items={items}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
