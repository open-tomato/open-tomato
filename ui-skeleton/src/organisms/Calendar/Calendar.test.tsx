import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Calendar, type DateRange } from './Calendar';

const JUNE_2024 = new Date(2024, 5, 1);

describe('Calendar', () => {
  it('renders the root frame, navigation buttons, weekday header, and the month grid for the requested month', () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JUNE_2024} size="lg" />,
    );

    const root = container.querySelector('[data-slot="calendar-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-mode', 'single');

    // The library exposes prev / next buttons with accessible labels.
    expect(
      screen.getByRole('button', { name: /previous month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /next month/i }),
    ).toBeInTheDocument();

    // The library renders the weekday header inside `<thead aria-hidden>`
    // (the grid pattern doesn't surface columnheaders to AT), so query the
    // <th scope="col"> cells directly for the count assertion.
    const weekdayCells = container.querySelectorAll('th[scope="col"]');
    expect(weekdayCells).toHaveLength(7);

    // The library reflects the displayed month in the caption label.
    expect(screen.getByText(/June 2024/i)).toBeInTheDocument();

    // The June 15, 2024 day button is in the grid.
    expect(
      screen.getByRole('button', { name: 'Saturday, June 15th, 2024' }),
    ).toBeInTheDocument();
  });

  it('composes the library role="grid" with one row per displayed week', () => {
    render(<Calendar mode="single" defaultMonth={JUNE_2024} />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
    // June 2024 spans six weeks of rows in the grid body.
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(6);
  });

  it('fires onSelect with a single Date in single mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(date: Date | undefined) => void>();
    render(
      <Calendar
        mode="single"
        defaultMonth={JUNE_2024}
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Saturday, June 15th, 2024' }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    const selected = onSelect.mock.calls[0]?.[0];
    expect(selected).toBeInstanceOf(Date);
    expect((selected as Date).getDate()).toBe(15);
    expect((selected as Date).getMonth()).toBe(5);
  });

  it('fires onSelect with a Date[] in multiple mode and accumulates picks', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(dates: Date[] | undefined) => void>();

    const Harness = (): React.JSX.Element => {
      const [dates, setDates] = React.useState<Date[] | undefined>([]);
      return (
        <Calendar
          mode="multiple"
          defaultMonth={JUNE_2024}
          selected={dates}
          onSelect={(next) => {
            setDates(next);
            onSelect(next);
          }}
        />
      );
    };
    render(<Harness />);

    await user.click(
      screen.getByRole('button', { name: 'Monday, June 3rd, 2024' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Saturday, June 15th, 2024' }),
    );

    expect(onSelect).toHaveBeenCalledTimes(2);
    const second = onSelect.mock.calls[1]?.[0];
    expect(Array.isArray(second)).toBe(true);
    expect(second).toHaveLength(2);
    expect((second as Date[]).map((d) => d.getDate()).sort((a, b) => a - b))
      .toEqual([3, 15]);
  });

  it('fires onSelect with a DateRange in range mode and fills from / to in order', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(range: DateRange | undefined) => void>();

    const Harness = (): React.JSX.Element => {
      const [range, setRange] = React.useState<DateRange | undefined>(undefined);
      return (
        <Calendar
          mode="range"
          defaultMonth={JUNE_2024}
          selected={range}
          onSelect={(next) => {
            setRange(next);
            onSelect(next);
          }}
        />
      );
    };
    render(<Harness />);

    await user.click(
      screen.getByRole('button', { name: 'Monday, June 3rd, 2024' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Monday, June 10th, 2024' }),
    );

    expect(onSelect).toHaveBeenCalledTimes(2);
    const first = onSelect.mock.calls[0]?.[0];
    const second = onSelect.mock.calls[1]?.[0];
    // First click opens the range with `from` set to June 3; the library
    // initializes `to` to the same day so the visible selection covers the
    // first click immediately. Second click extends `to` to June 10.
    expect(first?.from?.getDate()).toBe(3);
    expect(first?.to?.getDate()).toBe(3);
    expect(second?.from?.getDate()).toBe(3);
    expect(second?.to?.getDate()).toBe(10);
  });

  it('disables out-of-range days via the fromDate / toDate bounds', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(date: Date | undefined) => void>();

    render(
      <Calendar
        mode="single"
        defaultMonth={JUNE_2024}
        fromDate={new Date(2024, 5, 10)}
        toDate={new Date(2024, 5, 20)}
        onSelect={onSelect}
      />,
    );

    // June 5 sits before the fromDate bound — the library disables it.
    const outOfRange = screen.getByRole('button', {
      name: 'Wednesday, June 5th, 2024',
    });
    expect(outOfRange).toBeDisabled();
    await user.click(outOfRange);
    expect(onSelect).not.toHaveBeenCalled();

    // June 15 sits inside the bound — the library leaves it enabled.
    const inRange = screen.getByRole('button', {
      name: 'Saturday, June 15th, 2024',
    });
    expect(inRange).not.toBeDisabled();
    await user.click(inRange);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JUNE_2024} />,
    );
    // The library renders the day-button column headers as `<th>`. axe's
    // landmark `region` rule fires because the component-isolation scan has
    // no surrounding landmark; the consumer's app shell supplies it. Same
    // pattern as the menu-shaped organisms in this layer.
    expect(
      await axe(container, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();

    // Sanity: the visible day buttons live inside the rendered grid.
    const grid = screen.getByRole('grid');
    expect(within(grid).getAllByRole('button').length).toBeGreaterThan(0);
  });
});
