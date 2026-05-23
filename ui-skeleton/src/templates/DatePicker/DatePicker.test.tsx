import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';

/**
 * Locale-stable, timezone-stable ISO-shape formatter for test determinism.
 * `Date.prototype.toISOString` returns UTC, which drifts the calendar date
 * when the local timezone is anywhere west of UTC — the calendar grid
 * `Saturday, June 15th, 2024` is `2024-06-15` in local time but
 * `2024-06-14T...` in UTC for negative offsets.
 */
const isoFormat = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

describe('DatePicker', () => {
  it('renders the trigger with the placeholder and keeps the popover closed by default', () => {
    render(
      <DatePicker
        size="lg"
        placeholder="Pick a date"
        aria-label="Birthday"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Birthday' });
    expect(trigger).toHaveAttribute('data-slot', 'datepicker-trigger');
    expect(trigger).toHaveAttribute('data-size', 'lg');
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).toHaveAttribute('data-placeholder', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Pick a date');

    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('opens the popover and composes the Calendar organism when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        placeholder="Pick a date"
        aria-label="Trip start"
        defaultOpen={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Trip start' }));

    // Calendar renders inside Popover's portal; `findByRole('grid')` waits
    // for the portaled month grid to appear.
    const grid = await screen.findByRole('grid');
    expect(grid).toBeInTheDocument();

    // Trigger aria flips to expanded.
    const trigger = screen.getByRole('button', { name: 'Trip start' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('propagates size 1:1 to the composed Button, Popover, and Calendar via lookup tables', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        size="lg"
        placeholder="Pick a date"
        aria-label="Date"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Date' });
    expect(trigger).toHaveAttribute('data-size', 'lg');

    await user.click(trigger);

    // Calendar root reflects size via its own data-size attribute.
    const calendarRoot = await screen.findByRole('grid');
    const calendarFrame = calendarRoot.closest('[data-slot="calendar-root"]');
    expect(calendarFrame).not.toBeNull();
    expect(calendarFrame).toHaveAttribute('data-size', 'lg');

    // Popover Content reflects size via its own data-size attribute.
    const popoverContent = calendarFrame?.closest('[data-slot="popover-content"]');
    expect(popoverContent).not.toBeNull();
    expect(popoverContent).toHaveAttribute('data-size', 'lg');
  });

  it('selects a date, fires onValueChange, closes the popover, and surfaces the formatted date on the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(date: Date | undefined) => void>();
    render(
      <DatePicker
        placeholder="Pick a date"
        aria-label="Birthday"
        format={isoFormat}
        defaultValue={new Date(2024, 5, 1)}
        onValueChange={onValueChange}
      />,
    );

    // Trigger starts with the formatted default value (ISO).
    const trigger = screen.getByRole('button', { name: 'Birthday' });
    expect(trigger).toHaveTextContent('2024-06-01');
    expect(trigger).not.toHaveAttribute('data-placeholder');

    await user.click(trigger);
    await screen.findByRole('grid');

    // Click June 15, 2024 — `defaultValue` opens the calendar on that month.
    const day = screen.getByRole('button', { name: 'Saturday, June 15th, 2024' });
    await user.click(day);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const [selected] = onValueChange.mock.calls[0]!;
    expect(selected).toBeInstanceOf(Date);
    expect((selected as Date).getFullYear()).toBe(2024);
    expect((selected as Date).getMonth()).toBe(5);
    expect((selected as Date).getDate()).toBe(15);

    // Popover closes after selection (Calendar unmounts).
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    // Trigger reflects the new formatted value and state flips back to closed.
    expect(trigger).toHaveTextContent('2024-06-15');
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  it('honours the controlled `value` prop and never flips internal state on selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(date: Date | undefined) => void>();
    const initial = new Date(2024, 5, 1);

    const { rerender } = render(
      <DatePicker
        aria-label="Date"
        format={isoFormat}
        value={initial}
        onValueChange={onValueChange}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Date' });
    expect(trigger).toHaveTextContent('2024-06-01');

    await user.click(trigger);
    await screen.findByRole('grid');

    await user.click(screen.getByRole('button', { name: 'Monday, June 10th, 2024' }));
    expect(onValueChange).toHaveBeenLastCalledWith(expect.any(Date));
    // Controlled — trigger stays on the parent-owned value until the parent
    // re-renders with the new value.
    expect(trigger).toHaveTextContent('2024-06-01');

    rerender(
      <DatePicker
        aria-label="Date"
        format={isoFormat}
        value={new Date(2024, 5, 10)}
        onValueChange={onValueChange}
      />,
    );
    expect(trigger).toHaveTextContent('2024-06-10');
  });

  it('uses Intl.DateTimeFormat by default when no `format` is provided', () => {
    const fixed = new Date(2024, 5, 1);
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={fixed}
      />,
    );

    const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(fixed);
    expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(expected);
  });

  it('disables the trigger when `disabled` is true and blocks interaction', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        placeholder="Pick a date"
        disabled
        onValueChange={onValueChange}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Date' });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    // Disabled trigger does not open the popover.
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('coordinates open state via controlled-passthrough (open + onOpenChange)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    const Wrapper = (): React.JSX.Element => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <DatePicker
          aria-label="Date"
          placeholder="Pick a date"
          open={isOpen}
          onOpenChange={(next) => {
            onOpenChange(next);
            setIsOpen(next);
          }}
        />
      );
    };

    render(<Wrapper />);

    await user.click(screen.getByRole('button', { name: 'Date' }));
    await screen.findByRole('grid');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    // Escape dismisses the popover via Radix and routes through
    // onOpenChange, which the wrapper threads back into `open`.
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('has no a11y violations when open (scans document.body for the portaled Calendar)', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Birthday"
        placeholder="Pick a date"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Birthday' }));
    await screen.findByRole('grid');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
