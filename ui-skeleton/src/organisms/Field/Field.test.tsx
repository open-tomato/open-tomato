import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Field } from './Field';

describe('Field', () => {
  it('renders label, input, leading, trailing, description, and error slots', () => {
    const { container } = render(
      <Field
        label="Email"
        description="Helper text"
        error="Something is off"
        invalid
        leading={<span data-testid="leading-icon">@</span>}
        trailing={<span data-testid="trailing-icon">×</span>}
        placeholder="you@example.com"
      />,
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText('Helper text')).toBeInTheDocument();
    expect(screen.getByText('Something is off')).toBeInTheDocument();
    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trailing-icon')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="field-root"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="field-label"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="field-description"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="field-error"]')).not.toBeNull();
  });

  it('composes the Label and Input atoms with paired htmlFor and id', () => {
    render(<Field id="email" label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
    // The Label atom renders as a <label> with htmlFor matching the input id.
    const label = screen.getByText('Email').closest('label');
    expect(label).not.toBeNull();
    expect(label).toHaveAttribute('for', 'email');
  });

  it('auto-generates a stable id when no id prop is passed and points htmlFor at it', () => {
    const { container } = render(<Field label="Email" />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    const generatedId = input?.getAttribute('id');
    expect(generatedId).toBeTruthy();
    const label = screen.getByText('Email').closest('label');
    expect(label).toHaveAttribute('for', generatedId ?? '');
  });

  it('propagates size to the composed Label and Input atoms', () => {
    const { container } = render(<Field size="lg" label="Email" />);
    const root = container.querySelector('[data-slot="field-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');

    const label = container.querySelector('[data-slot="field-label"]');
    expect(label).toHaveAttribute('data-size', 'lg');

    const inputRoot = container.querySelector('[data-slot="input-root"]');
    expect(inputRoot).toHaveAttribute('data-size', 'lg');
  });

  it('maps invalid to the Input variant=error and surfaces aria-invalid + aria-describedby', () => {
    const { container } = render(
      <Field
        id="username"
        label="Username"
        description="3-32 characters"
        error="That username is taken"
        invalid
      />,
    );

    const root = container.querySelector('[data-slot="field-root"]');
    expect(root).toHaveAttribute('data-invalid', '');

    const inputRoot = container.querySelector('[data-slot="input-root"]');
    expect(inputRoot).toHaveAttribute('data-variant', 'error');

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input?.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toEqual(
      expect.arrayContaining(['username-description', 'username-error']),
    );
  });

  it('preserves a consumer-supplied aria-describedby and appends the auto-derived ids', () => {
    const { container } = render(
      <Field
        id="email"
        label="Email"
        description="Helper"
        aria-describedby="external-hint"
      />,
    );
    const input = container.querySelector('input');
    const describedBy = input?.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toEqual([
      'external-hint',
      'email-description',
    ]);
  });

  it('omits description and error wrappers when their slot props are not provided', () => {
    const { container } = render(<Field label="Email" />);
    expect(
      container.querySelector('[data-slot="field-description"]'),
    ).toBeNull();
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(container.querySelector('input')?.getAttribute('aria-describedby'))
      .toBeNull();
  });

  it('forwards the ref to the inner native input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Field ref={ref} label="Email" defaultValue="seed" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe('seed');
  });

  it('forwards user keystrokes through to the native input', async () => {
    const user = userEvent.setup();
    render(<Field label="Email" placeholder="you@example.com" />);
    const input = screen.getByLabelText('Email');
    await user.type(input, 'hi@example.com');
    expect(input).toHaveValue('hi@example.com');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Field
        label="Email"
        description="We'll never share your email."
        placeholder="you@example.com"
        required
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations in the invalid + error state', async () => {
    const { container } = render(
      <Field
        label="Username"
        description="3-32 characters"
        error="That username is taken"
        invalid
        defaultValue="taken"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
