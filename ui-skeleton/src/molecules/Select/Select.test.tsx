import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Select, type SelectItemDescriptor } from './Select';

const fruits: SelectItemDescriptor[] = [
  { type: 'item', value: 'apple', label: 'Apple' },
  { type: 'item', value: 'banana', label: 'Banana' },
  { type: 'separator' },
  { type: 'item', value: 'cherry', label: 'Cherry', disabled: true },
];

describe('Select', () => {
  it('renders the default trigger with placeholder and combobox role', () => {
    render(
      <Select
        items={fruits}
        placeholder="Pick a fruit"
        triggerProps={{ 'aria-label': 'Fruit' }}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Fruit/ });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-slot', 'select-trigger');
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('propagates molecule axes to the trigger data-attributes via wrapperFrameVariants', () => {
    render(
      <Select
        items={fruits}
        placeholder="Pick"
        variant="error"
        size="lg"
        density="compact"
        tone="subtle"
        triggerProps={{ 'aria-label': 'Sized' }}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Sized/ });
    expect(trigger).toHaveAttribute('data-variant', 'error');
    expect(trigger).toHaveAttribute('data-size', 'lg');
    expect(trigger).toHaveAttribute('data-density', 'compact');
    expect(trigger).toHaveAttribute('data-tone', 'subtle');
  });

  it('renders portaled items wrapped in Typography(body) when defaultOpen', async () => {
    render(
      <Select
        items={fruits}
        defaultOpen
        placeholder="Pick"
        triggerProps={{ 'aria-label': 'Fruit' }}
        contentProps={{ 'aria-label': 'Fruit options' }}
      />,
    );

    const listbox = await screen.findByRole('listbox', { name: /Fruit options/ });
    const appleOption = within(listbox).getByRole('option', { name: /Apple/ });
    const appleLabel = within(appleOption).getByText('Apple');
    expect(appleLabel).toHaveAttribute('data-slot', 'select-item-label');
    expect(appleLabel).toHaveAttribute('data-variant', 'body');

    expect(within(listbox).getByRole('option', { name: /Banana/ })).toBeInTheDocument();
    const cherry = within(listbox).getByRole('option', { name: /Cherry/ });
    expect(cherry).toHaveAttribute('data-disabled', '');
  });

  it('renders separators between item groups', async () => {
    const { baseElement } = render(
      <Select
        items={fruits}
        defaultOpen
        placeholder="Pick"
        triggerProps={{ 'aria-label': 'Fruit' }}
        contentProps={{ 'aria-label': 'Fruit options' }}
      />,
    );
    await screen.findByRole('listbox', { name: /Fruit options/ });
    const separators = baseElement.querySelectorAll('[data-slot="select-separator"]');
    expect(separators.length).toBe(1);
  });

  it('supports a custom trigger element via asChild override', () => {
    render(
      <Select
        items={fruits}
        placeholder="Pick"
        trigger={<button type="button" aria-label="Custom trigger">Choose…</button>}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: /Custom trigger/ });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveTextContent('Choose…');
    expect(trigger).not.toHaveAttribute('data-slot', 'select-trigger');
  });

  it('has no a11y violations when open', async () => {
    const { baseElement } = render(
      <main>
        <Select
          items={fruits}
          defaultOpen
          placeholder="Pick a fruit"
          triggerProps={{ 'aria-label': 'Fruit' }}
          contentProps={{ 'aria-label': 'Fruit options' }}
        />
      </main>,
    );
    await screen.findByRole('listbox', { name: /Fruit options/ });
    /**
     * `region` is disabled because Radix portals the listbox to
     * `document.body` — outside the test's `<main>` landmark. In real usage
     * the consumer's app shell provides the landmark.
     */
    expect(
      await axe(baseElement, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
