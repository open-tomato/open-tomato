import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders a checkbox with the accessible name from aria-label', () => {
    render(<Checkbox aria-label="Accept" />);
    expect(screen.getByRole('checkbox', { name: 'Accept' })).toBeInTheDocument();
  });

  it('applies the variant class for the lg size', () => {
    render(<Checkbox aria-label="x" size="lg" />);
    expect(screen.getByRole('checkbox')).toHaveClass('size-6');
  });

  it('exposes the resolved size via data attribute', () => {
    render(<Checkbox aria-label="x" size="sm" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to md when size is omitted', () => {
    render(<Checkbox aria-label="x" />);
    const cb = screen.getByRole('checkbox');
    expect(cb).toHaveAttribute('data-size', 'md');
    expect(cb).toHaveClass('size-5');
  });

  it('renders a label linked to the checkbox via htmlFor/id', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
  });

  it('toggles checked state when the label is clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept terms" />);
    const cb = screen.getByRole('checkbox', { name: 'Accept terms' });
    expect(cb).toHaveAttribute('data-state', 'unchecked');
    await user.click(screen.getByText('Accept terms'));
    expect(cb).toHaveAttribute('data-state', 'checked');
  });

  it('reflects the indeterminate state on the trigger', () => {
    render(<Checkbox aria-label="x" checked="indeterminate" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'indeterminate');
  });

  it('forwards disabled to the underlying button', () => {
    render(<Checkbox aria-label="x" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('returns just the checkbox (no wrapper) when label is omitted', () => {
    const { container } = render(<Checkbox aria-label="Toggle" />);
    expect(container.querySelector('[data-slot="checkbox-root"]')).toBeNull();
    expect(container.querySelector('[data-slot="checkbox-label"]')).toBeNull();
  });

  it('emits the label slot when label is provided', () => {
    const { container } = render(<Checkbox label="Accept" />);
    expect(container.querySelector('[data-slot="checkbox-root"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="checkbox-label"]')).not.toBeNull();
  });

  it('has no a11y violations with a label', async () => {
    const { container } = render(<Checkbox label="Accept terms" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations with aria-label only', async () => {
    const { container } = render(<Checkbox aria-label="Toggle" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
