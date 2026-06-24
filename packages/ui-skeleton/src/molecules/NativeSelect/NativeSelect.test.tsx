import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NativeSelect, type NativeSelectOptionDescriptor } from './NativeSelect';

const fruits: NativeSelectOptionDescriptor[] = [
  { type: 'option', value: 'apple', label: 'Apple' },
  { type: 'option', value: 'banana', label: 'Banana' },
  { type: 'option', value: 'cherry', label: 'Cherry', disabled: true },
];

describe('NativeSelect', () => {
  it('renders a combobox role and the chevron slot by default', () => {
    const { container } = render(
      <NativeSelect aria-label="Fruit" options={fruits} />,
    );
    const select = screen.getByRole('combobox', { name: 'Fruit' });
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('data-slot', 'native-select-control');
    expect(container.querySelector('[data-slot="native-select-root"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="native-select-chevron"]')).not.toBeNull();
  });

  it('renders the leading icon slot when provided', () => {
    const { container } = render(
      <NativeSelect
        aria-label="Fruit"
        options={fruits}
        leadingIcon={<span data-testid="leading">L</span>}
      />,
    );
    expect(container.querySelector('[data-slot="native-select-leading-icon"]')).not.toBeNull();
    expect(screen.getByTestId('leading')).toBeInTheDocument();
  });

  it('omits the leading icon slot when not provided', () => {
    const { container } = render(<NativeSelect aria-label="x" options={fruits} />);
    expect(container.querySelector('[data-slot="native-select-leading-icon"]')).toBeNull();
  });

  it('strips the OS-default chevron via appearance-none on the control', () => {
    render(<NativeSelect aria-label="Fruit" options={fruits} />);
    const select = screen.getByRole('combobox', { name: 'Fruit' });
    expect(select).toHaveClass('appearance-none');
  });

  it('exposes resolved variant, size, density, and tone via data attributes on the root', () => {
    const { container } = render(
      <NativeSelect
        aria-label="x"
        options={fruits}
        variant="success"
        size="sm"
        density="compact"
        tone="subtle"
      />,
    );
    const root = container.querySelector('[data-slot="native-select-root"]');
    expect(root).toHaveAttribute('data-variant', 'success');
    expect(root).toHaveAttribute('data-size', 'sm');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-tone', 'subtle');
  });

  it('defaults to default/md/comfortable/neutral when variants are omitted', () => {
    const { container } = render(<NativeSelect aria-label="x" options={fruits} />);
    const root = container.querySelector('[data-slot="native-select-root"]');
    expect(root).toHaveAttribute('data-variant', 'default');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-density', 'comfortable');
    expect(root).toHaveAttribute('data-tone', 'neutral');
    expect(root).toHaveClass('border-input');
    expect(root).toHaveClass('h-9');
  });

  it('propagates the wrapper-frame error variant onto the root', () => {
    const { container } = render(
      <NativeSelect aria-label="x" options={fruits} variant="error" />,
    );
    const root = container.querySelector('[data-slot="native-select-root"]');
    expect(root).toHaveClass('border-destructive');
  });

  it('propagates size=lg onto the root frame class', () => {
    const { container } = render(
      <NativeSelect aria-label="x" options={fruits} size="lg" />,
    );
    const root = container.querySelector('[data-slot="native-select-root"]');
    expect(root).toHaveClass('h-10');
  });

  it('propagates tone=subtle onto the root frame class', () => {
    const { container } = render(
      <NativeSelect aria-label="x" options={fruits} tone="subtle" />,
    );
    const root = container.querySelector('[data-slot="native-select-root"]');
    expect(root).toHaveClass('bg-muted/40');
    expect(root).toHaveClass('border-0');
  });

  it('automatically sets aria-invalid on the inner select when variant=error', () => {
    render(<NativeSelect aria-label="bad" options={fruits} variant="error" />);
    expect(screen.getByRole('combobox', { name: 'bad' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('honours an explicit aria-invalid override on error variant', () => {
    render(<NativeSelect aria-label="ok" options={fruits} variant="error" aria-invalid={false} />);
    expect(screen.getByRole('combobox', { name: 'ok' })).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders the placeholder as a disabled hidden option', () => {
    const { container } = render(
      <NativeSelect
        aria-label="Fruit"
        options={fruits}
        placeholder="Pick a fruit"
        defaultValue=""
      />,
    );
    const placeholder = container.querySelector('option[value=""]');
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveTextContent('Pick a fruit');
    expect(placeholder).toBeDisabled();
    expect(placeholder).toHaveAttribute('hidden');
  });

  it('renders data-driven options from the options prop', () => {
    render(<NativeSelect aria-label="Fruit" options={fruits} />);
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cherry' })).toBeDisabled();
  });

  it('renders <optgroup> entries when the options descriptor uses type=group', () => {
    const grouped: NativeSelectOptionDescriptor[] = [
      {
        type: 'group',
        label: 'Citrus',
        options: [
          { type: 'option', value: 'lemon', label: 'Lemon' },
          { type: 'option', value: 'lime', label: 'Lime' },
        ],
      },
      { type: 'option', value: 'apple', label: 'Apple' },
    ];
    const { container } = render(<NativeSelect aria-label="Fruit" options={grouped} />);
    const group = container.querySelector('optgroup[label="Citrus"]');
    expect(group).not.toBeNull();
    expect(within(group as HTMLElement).getByRole('option', { name: 'Lemon' })).toBeInTheDocument();
    expect(within(group as HTMLElement).getByRole('option', { name: 'Lime' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
  });

  it('falls back to children when options is omitted', () => {
    render(
      <NativeSelect aria-label="Fruit">
        <option value="">none</option>
        <option value="apple">Apple</option>
      </NativeSelect>,
    );
    expect(screen.getByRole('option', { name: 'none' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
  });

  it('forwards ref to the inner select element', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<NativeSelect aria-label="x" options={fruits} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('forwards disabled to the inner select', () => {
    render(<NativeSelect aria-label="x" options={fruits} disabled />);
    expect(screen.getByRole('combobox', { name: 'x' })).toBeDisabled();
  });

  it('supports controlled value changes via userEvent.selectOptions', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <NativeSelect
        aria-label="Fruit"
        options={fruits}
        defaultValue="apple"
        onChange={handleChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Fruit' });
    expect(select).toHaveValue('apple');
    await user.selectOptions(select, 'banana');
    expect(select).toHaveValue('banana');
    expect(handleChange).toHaveBeenCalled();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <>
        <label htmlFor="fruit-select">Fruit</label>
        <NativeSelect id="fruit-select" options={fruits} />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
