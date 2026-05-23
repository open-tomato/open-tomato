import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { Calendar, type DateRange } from './Calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Organisms/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'inline-radio', options: ['single', 'multiple', 'range'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    mode: 'single',
    size: 'md',
  },
};
export default meta;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  render: (args) => {
    const SingleHarness = (): React.JSX.Element => {
      const [date, setDate] = React.useState<Date | undefined>(undefined);
      return (
        <Calendar {...args} mode="single" selected={date} onSelect={setDate} />
      );
    };
    return <SingleHarness />;
  },
};

export const PresetSingle: Story = {
  render: () => {
    const SingleHarness = (): React.JSX.Element => {
      const [date, setDate] = React.useState<Date | undefined>(new Date());
      return <Calendar mode="single" selected={date} onSelect={setDate} />;
    };
    return <SingleHarness />;
  },
};

export const Multiple: Story = {
  render: () => {
    const MultipleHarness = (): React.JSX.Element => {
      const [dates, setDates] = React.useState<Date[] | undefined>([]);
      return (
        <Calendar mode="multiple" selected={dates} onSelect={setDates} />
      );
    };
    return <MultipleHarness />;
  },
};

export const Range: Story = {
  render: () => {
    const RangeHarness = (): React.JSX.Element => {
      const [range, setRange] = React.useState<DateRange | undefined>(undefined);
      return (
        <Calendar mode="range" selected={range} onSelect={setRange} />
      );
    };
    return <RangeHarness />;
  },
};

export const BoundedNavigation: Story = {
  render: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const Harness = (): React.JSX.Element => {
      const [date, setDate] = React.useState<Date | undefined>(undefined);
      return (
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          fromDate={start}
          toDate={end}
        />
      );
    };
    return <Harness />;
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">
            size=
            <code>{size}</code>
          </div>
          <Calendar mode="single" size={size} />
        </div>
      ))}
    </div>
  ),
};
