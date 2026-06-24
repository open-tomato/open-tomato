import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/atoms/Button';

import { Accordion, type AccordionItemEntry } from './Accordion';

const baseItems: AccordionItemEntry[] = [
  {
    type: 'item',
    value: 'overview',
    trigger: <Button variant="ghost">Overview</Button>,
    content: <p>Overview body</p>,
  },
  {
    type: 'item',
    value: 'details',
    trigger: <Button variant="ghost">Details</Button>,
    content: <p>Details body</p>,
  },
  {
    type: 'item',
    value: 'history',
    trigger: <Button variant="ghost">History</Button>,
    content: <p>History body</p>,
    disabled: true,
  },
];

describe('Accordion', () => {
  it('renders one item per descriptor with the resolved root data attributes', () => {
    const { container } = render(
      <Accordion type="single" size="lg" orientation="vertical" items={baseItems} />,
    );

    const root = container.querySelector('[data-slot="accordion-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-state', 'closed');
    expect(root).toHaveAttribute('data-chevron', 'trailing');

    const items = container.querySelectorAll('[data-slot="accordion-item"]');
    expect(items).toHaveLength(3);

    expect(screen.getByRole('button', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Details/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /History/ })).toBeInTheDocument();
  });

  it('reflects per-item data-state via Radix and rotates the auto-injected chevron when opened', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Accordion type="single" items={baseItems} />,
    );

    const overviewTrigger = screen.getByRole('button', { name: /Overview/ });
    expect(overviewTrigger).toHaveAttribute('data-state', 'closed');

    const chevrons = container.querySelectorAll('[data-slot="accordion-chevron"]');
    expect(chevrons).toHaveLength(3);
    for (const chevron of chevrons) {
      expect(chevron).toHaveAttribute('data-state', 'closed');
    }

    await user.click(overviewTrigger);
    expect(overviewTrigger).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('Overview body')).toBeInTheDocument();

    const rootAfter = container.querySelector('[data-slot="accordion-root"]');
    expect(rootAfter).toHaveAttribute('data-state', 'open');

    const overviewChevron = container.querySelector(
      '[data-slot="accordion-item"]:first-child [data-slot="accordion-chevron"]',
    );
    expect(overviewChevron).toHaveAttribute('data-state', 'open');
  });

  it('honours the disabled flag on individual items in single mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Accordion type="single" items={baseItems} onValueChange={onValueChange} />,
    );

    const disabledTrigger = screen.getByRole('button', { name: /History/ });
    expect(disabledTrigger).toBeDisabled();

    await user.click(disabledTrigger);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('fires onValueChange with a string in single mode and an array in multiple mode', async () => {
    const user = userEvent.setup();
    const onSingle = vi.fn<(value: string) => void>();
    const { rerender } = render(
      <Accordion type="single" items={baseItems} onValueChange={onSingle} />,
    );
    await user.click(screen.getByRole('button', { name: /Overview/ }));
    expect(onSingle).toHaveBeenLastCalledWith('overview');

    const onMultiple = vi.fn<(value: string[]) => void>();
    rerender(
      <Accordion type="multiple" items={baseItems} onValueChange={onMultiple} />,
    );
    await user.click(screen.getByRole('button', { name: /Overview/ }));
    await user.click(screen.getByRole('button', { name: /Details/ }));
    expect(onMultiple).toHaveBeenNthCalledWith(1, ['overview']);
    expect(onMultiple).toHaveBeenNthCalledWith(2, ['overview', 'details']);
  });

  it('omits the auto-injected chevron when chevron="none"', () => {
    const { container } = render(
      <Accordion type="single" chevron="none" items={baseItems} />,
    );
    expect(container.querySelector('[data-slot="accordion-chevron"]')).toBeNull();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Accordion
        type="single"
        defaultValue="overview"
        items={baseItems}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
