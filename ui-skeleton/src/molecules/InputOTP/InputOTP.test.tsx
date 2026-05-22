import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InputOTP } from './InputOTP';

describe('InputOTP', () => {
  it('renders the default 6 slots and the data-slot=root + data-slot=control anchors', () => {
    const { container } = render(<InputOTP aria-label="One-time code" />);
    expect(container.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(6);
    expect(container.querySelector('[data-slot="input-otp-root"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="input-otp-control"]')).not.toBeNull();
  });

  it('renders 4 slots when length="4"', () => {
    const { container } = render(<InputOTP length="4" aria-label="PIN" />);
    expect(container.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(4);
  });

  it('renders 8 slots when length="8"', () => {
    const { container } = render(<InputOTP length="8" aria-label="Recovery" />);
    expect(container.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(8);
  });

  it('defaults the hidden input to inputMode=numeric and autoComplete=one-time-code', () => {
    render(<InputOTP aria-label="code" />);
    const input = screen.getByRole('textbox', { name: 'code' });
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('honours overrides for inputMode and autoComplete', () => {
    render(
      <InputOTP
        aria-label="code"
        inputMode="text"
        autoComplete="off"
        pattern="^[a-zA-Z0-9]+$"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'code' });
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('exposes resolved length and size via data attributes on the root', () => {
    const { container } = render(
      <InputOTP aria-label="code" length="8" size="lg" />,
    );
    const root = container.querySelector('[data-slot="input-otp-root"]');
    expect(root).toHaveAttribute('data-length', '8');
    expect(root).toHaveAttribute('data-size', 'lg');
  });

  it('propagates size onto every slot', () => {
    const { container } = render(<InputOTP aria-label="code" size="sm" />);
    const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');
    expect(slots).toHaveLength(6);
    slots.forEach((slot) => {
      expect(slot).toHaveAttribute('data-size', 'sm');
      expect(slot).toHaveClass('h-8');
    });
  });

  it('defaults to length=6 / size=md when variants are omitted', () => {
    const { container } = render(<InputOTP aria-label="code" />);
    const root = container.querySelector('[data-slot="input-otp-root"]');
    expect(root).toHaveAttribute('data-length', '6');
    expect(root).toHaveAttribute('data-size', 'md');
  });

  it('renders chars from a controlled value into the corresponding slots', () => {
    const { container } = render(
      <InputOTP aria-label="code" value="12" onChange={() => {}} />,
    );
    const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');
    expect(slots[0]).toHaveTextContent('1');
    expect(slots[1]).toHaveTextContent('2');
    expect(slots[2]).toHaveTextContent('');
  });

  it('automatically sets aria-invalid on the hidden input and data-invalid on the root when invalid', () => {
    const { container } = render(<InputOTP aria-label="bad" invalid />);
    expect(screen.getByRole('textbox', { name: 'bad' })).toHaveAttribute('aria-invalid', 'true');
    const root = container.querySelector('[data-slot="input-otp-root"]');
    expect(root).toHaveAttribute('data-invalid', 'true');
    const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');
    slots.forEach((slot) => {
      expect(slot).toHaveAttribute('data-invalid', 'true');
      expect(slot).toHaveClass('border-destructive');
    });
  });

  it('honours an explicit aria-invalid override on the invalid flag', () => {
    render(<InputOTP aria-label="ok" invalid aria-invalid={false} />);
    expect(screen.getByRole('textbox', { name: 'ok' })).toHaveAttribute('aria-invalid', 'false');
  });

  it('fires onChange with the new value when the hidden input changes', () => {
    const handleChange = vi.fn();
    render(<InputOTP aria-label="code" onChange={handleChange} />);
    const input = screen.getByRole('textbox', { name: 'code' });
    fireEvent.change(input, { target: { value: '123' } });
    expect(handleChange).toHaveBeenCalledWith('123');
  });

  it('fires onComplete once the value reaches the configured length', () => {
    const handleComplete = vi.fn();
    const Wrapper = (): React.ReactElement => {
      const [value, setValue] = React.useState('');
      return (
        <InputOTP
          aria-label="code"
          length="4"
          value={value}
          onChange={setValue}
          onComplete={handleComplete}
        />
      );
    };
    render(<Wrapper />);
    const input = screen.getByRole('textbox', { name: 'code' });
    fireEvent.change(input, { target: { value: '1234' } });
    expect(handleComplete).toHaveBeenCalledWith('1234');
  });

  it('forwards ref to the hidden input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<InputOTP aria-label="code" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute('data-slot', 'input-otp-control');
  });

  it('forwards disabled to the hidden input', () => {
    render(<InputOTP aria-label="code" disabled />);
    expect(screen.getByRole('textbox', { name: 'code' })).toBeDisabled();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <>
        <label htmlFor="otp">One-time code</label>
        <InputOTP id="otp" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
