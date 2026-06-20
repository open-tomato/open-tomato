import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { DatePicker } from './DatePicker';

const isoFormat = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const meta: Meta<typeof DatePicker> = {
  title: 'Templates/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    'aria-label': { control: 'text' },
  },
  args: {
    size: 'md',
    placeholder: 'Pick a date',
    'aria-label': 'Date',
  },
};
export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: new Date(2024, 5, 15),
  },
};

export const CustomFormat: Story = {
  args: {
    defaultValue: new Date(2024, 5, 15),
    format: isoFormat,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: new Date(2024, 5, 15),
  },
};

export const Controlled: Story = {
  render: function ControlledStory(args) {
    const [date, setDate] = React.useState<Date | undefined>(undefined);
    return (
      <div className="flex flex-col gap-3">
        <DatePicker
          {...args}
          value={date}
          onValueChange={setDate}
        />
        <p className="text-sm text-muted-foreground">
          Selected:
          {' '}
          {date
            ? isoFormat(date)
            : '(none)'}
        </p>
      </div>
    );
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <DatePicker
          key={size}
          size={size}
          placeholder={`Pick a date (${size})`}
          aria-label={`Date (${size})`}
        />
      ))}
    </div>
  ),
};
