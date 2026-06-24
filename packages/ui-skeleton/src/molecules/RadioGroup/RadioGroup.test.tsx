import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { RadioGroup } from './RadioGroup';

const items = [
  { value: 'one', label: 'Option one' },
  { value: 'two', label: 'Option two', description: 'Helper text' },
  { value: 'three', label: 'Option three', disabled: true },
];

describe('RadioGroup', () => {
  it('renders a radio per item with the resolved data attributes', () => {
    const { container } = render(
      <RadioGroup
        aria-label="Choose option"
        size="lg"
        orientation="horizontal"
        items={items}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);

    const root = container.querySelector('[role="radiogroup"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('exposes label and description slots only for items that supply them', () => {
    const { container } = render(<RadioGroup aria-label="x" items={items} />);
    const labels = container.querySelectorAll('[data-slot="radio-group-item-label"]');
    const descriptions = container.querySelectorAll(
      '[data-slot="radio-group-item-description"]',
    );
    expect(labels).toHaveLength(3);
    expect(descriptions).toHaveLength(1);
    expect(descriptions[0]).toHaveTextContent('Helper text');
  });

  it('pairs each radio with its label via auto-generated htmlFor/id', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        aria-label="Choose option"
        items={items}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByText('Option one'));

    expect(onValueChange).toHaveBeenCalledWith('one');
    expect(screen.getByRole('radio', { name: /Option one/ })).toHaveAttribute(
      'data-state',
      'checked',
    );
  });

  it('honours the disabled flag on individual items', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="x" items={items} onValueChange={onValueChange} />,
    );

    const disabled = screen.getByRole('radio', { name: /Option three/ });
    expect(disabled).toBeDisabled();
    await user.click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('respects controlled value without invoking onValueChange internally', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        aria-label="Choose option"
        value="one"
        onValueChange={onValueChange}
        items={items}
      />,
    );

    const one = screen.getByRole('radio', { name: /Option one/ });
    const two = screen.getByRole('radio', { name: /Option two/ });
    expect(one).toHaveAttribute('data-state', 'checked');
    expect(two).toHaveAttribute('data-state', 'unchecked');

    await user.click(two);
    expect(onValueChange).toHaveBeenCalledWith('two');
    // Stays on 'one' because the consumer owns the controlled value.
    expect(one).toHaveAttribute('data-state', 'checked');
    expect(two).toHaveAttribute('data-state', 'unchecked');
  });

  it('has no a11y violations with labels and descriptions', async () => {
    const { container } = render(
      <RadioGroup aria-label="Choose option" items={items} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
