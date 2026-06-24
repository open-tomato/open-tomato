import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, type TabsItemEntry } from './Tabs';

const baseItems: TabsItemEntry[] = [
  {
    value: 'overview',
    trigger: 'Overview',
    content: <p>Overview body</p>,
  },
  {
    value: 'details',
    trigger: 'Details',
    content: <p>Details body</p>,
  },
  {
    value: 'history',
    trigger: 'History',
    content: <p>History body</p>,
    disabled: true,
  },
];

describe('Tabs', () => {
  it('renders one trigger and one panel per descriptor with the resolved root data attributes', () => {
    const { container } = render(
      <Tabs
        size="lg"
        orientation="vertical"
        density="compact"
        defaultValue="overview"
        items={baseItems}
        aria-label="Section tabs"
      />,
    );

    const root = container.querySelector('[data-slot="tabs-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-state', 'active');

    const list = screen.getByRole('tablist');
    expect(list).toHaveAttribute('aria-label', 'Section tabs');
    expect(list).toHaveAttribute('aria-orientation', 'vertical');

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
  });

  it('propagates size to the composed Button atom via the lookup table', () => {
    render(
      <Tabs
        size="lg"
        defaultValue="overview"
        items={baseItems}
      />,
    );

    const overviewTrigger = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTrigger).toHaveAttribute('data-size', 'lg');

    const detailsTrigger = screen.getByRole('tab', { name: 'Details' });
    expect(detailsTrigger).toHaveAttribute('data-size', 'lg');
  });

  it('maps the active trigger to Button variant="secondary" and inactive to variant="ghost"', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="overview" items={baseItems} />,
    );

    const overviewTrigger = screen.getByRole('tab', { name: 'Overview' });
    const detailsTrigger = screen.getByRole('tab', { name: 'Details' });

    expect(overviewTrigger).toHaveAttribute('data-variant', 'secondary');
    expect(detailsTrigger).toHaveAttribute('data-variant', 'ghost');

    await user.click(detailsTrigger);

    expect(overviewTrigger).toHaveAttribute('data-variant', 'ghost');
    expect(detailsTrigger).toHaveAttribute('data-variant', 'secondary');
  });

  it('honours the disabled flag on individual items and skips selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        defaultValue="overview"
        items={baseItems}
        onValueChange={onValueChange}
      />,
    );

    const disabledTrigger = screen.getByRole('tab', { name: 'History' });
    expect(disabledTrigger).toBeDisabled();

    await user.click(disabledTrigger);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('switches the active panel via uncontrolled state and fires onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string) => void>();
    render(
      <Tabs
        defaultValue="overview"
        items={baseItems}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByText('Overview body')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Details' }));
    expect(onValueChange).toHaveBeenCalledWith('details');
    expect(screen.getByText('Details body')).toBeInTheDocument();
  });

  it('honours the controlled value prop and does not flip internal state', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string) => void>();
    const { rerender } = render(
      <Tabs value="overview" items={baseItems} onValueChange={onValueChange} />,
    );

    expect(screen.getByText('Overview body')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Details' }));
    expect(onValueChange).toHaveBeenLastCalledWith('details');
    // Controlled — still on overview until parent re-renders with value="details"
    expect(screen.getByText('Overview body')).toBeInTheDocument();

    rerender(
      <Tabs value="details" items={baseItems} onValueChange={onValueChange} />,
    );
    expect(screen.getByText('Details body')).toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Tabs defaultValue="overview" items={baseItems} aria-label="Section tabs" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
