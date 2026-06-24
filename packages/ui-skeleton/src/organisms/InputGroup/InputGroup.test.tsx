import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { InputGroup } from './InputGroup';

describe('InputGroup', () => {
  it('renders the inner input, leading, and trailing slots', () => {
    const { container } = render(
      <InputGroup
        aria-label="Search"
        placeholder="Search"
        leading={<span data-testid="leading-kbd">⌘</span>}
        trailing={(
          <button type="button" data-testid="trailing-button">
            Apply
          </button>
        )}
      />,
    );

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByTestId('leading-kbd')).toBeInTheDocument();
    expect(screen.getByTestId('trailing-button')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="input-group-root"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="input-group-leading"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="input-group-control"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="input-group-trailing"]'),
    ).not.toBeNull();
  });

  it('applies the shared wrapper-frame border treatment around input + slots', () => {
    const { container } = render(
      <InputGroup
        aria-label="Search"
        leading={<span>A</span>}
        trailing={<span>B</span>}
      />,
    );
    const root = container.querySelector('[data-slot="input-group-root"]');
    expect(root).not.toBeNull();
    // wrapper-frame particle: border + rounded-md + flex layout.
    expect(root?.className).toMatch(/\bborder\b/);
    expect(root?.className).toMatch(/\brounded-md\b/);
    expect(root?.className).toMatch(/\bflex\b/);
    expect(root?.className).toMatch(/\bitems-center\b/);
  });

  it('propagates size to the root and addon slots via data attributes and class output', () => {
    const { container } = render(
      <InputGroup
        aria-label="Search"
        size="lg"
        leading={<span>L</span>}
        trailing={<span>T</span>}
      />,
    );
    const root = container.querySelector('[data-slot="input-group-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    // The lg size from wrapper-frame translates to h-10.
    expect(root?.className).toMatch(/\bh-10\b/);

    const leading = container.querySelector('[data-slot="input-group-leading"]');
    const trailing = container.querySelector(
      '[data-slot="input-group-trailing"]',
    );
    // Addon size axis: lg → text-base.
    expect(leading?.className).toMatch(/\btext-base\b/);
    expect(trailing?.className).toMatch(/\btext-base\b/);
  });

  it('maps invalid to wrapper-frame variant=error and aria-invalid on the input', () => {
    const { container } = render(
      <InputGroup aria-label="Code" invalid defaultValue="bad" />,
    );
    const root = container.querySelector('[data-slot="input-group-root"]');
    expect(root).toHaveAttribute('data-invalid', '');
    // wrapper-frame variant=error → border-destructive + focus-within:ring-destructive.
    expect(root?.className).toMatch(/border-destructive/);
    expect(root?.className).toMatch(/focus-within:ring-destructive/);

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('preserves a consumer-supplied aria-invalid override', () => {
    const { container } = render(
      <InputGroup
        aria-label="Code"
        invalid
        aria-invalid={false}
        defaultValue="seed"
      />,
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('omits leading and trailing wrappers when their slot props are not provided', () => {
    const { container } = render(
      <InputGroup aria-label="Search" placeholder="Search" />,
    );
    expect(
      container.querySelector('[data-slot="input-group-leading"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="input-group-trailing"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="input-group-control"]'),
    ).not.toBeNull();
  });

  it('defaults the inner input type to "text" when no type prop is passed', () => {
    const { container } = render(<InputGroup aria-label="Search" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('forwards a consumer-supplied input type through to the inner input', () => {
    const { container } = render(
      <InputGroup aria-label="Email" type="email" />,
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('forwards the ref to the inner native input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<InputGroup ref={ref} aria-label="Code" defaultValue="seed" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe('seed');
  });

  it('forwards user keystrokes through to the native input', async () => {
    const user = userEvent.setup();
    render(<InputGroup aria-label="Search" placeholder="Search" />);
    const input = screen.getByPlaceholderText('Search');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('has no a11y violations in the default state', async () => {
    const { container } = render(
      <InputGroup
        aria-label="Search"
        leading={<span aria-hidden>⌘</span>}
        placeholder="Search…"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations in the invalid state', async () => {
    const { container } = render(
      <InputGroup
        aria-label="Coupon"
        aria-describedby="coupon-error"
        invalid
        defaultValue="invalid"
        trailing={(
          <button type="button" aria-label="Apply coupon">
            Apply
          </button>
        )}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
