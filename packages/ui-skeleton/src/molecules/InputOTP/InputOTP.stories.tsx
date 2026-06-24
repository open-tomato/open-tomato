import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { InputOTP } from './InputOTP';

const meta: Meta<typeof InputOTP> = {
  title: 'Molecules/InputOTP',
  component: InputOTP,
  tags: ['autodocs'],
  argTypes: {
    length: { control: 'select', options: ['4', '6', '8'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    'length': '6',
    'size': 'md',
    'invalid': false,
    'disabled': false,
    'aria-label': 'One-time code',
  },
};
export default meta;

type Story = StoryObj<typeof InputOTP>;

export const Default: Story = {};

export const Length4: Story = {
  args: { length: '4' },
};

export const Length8: Story = {
  args: { length: '8' },
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <InputOTP
          key={size}
          {...args}
          size={size}
          aria-label={`Code (${size})`}
        />
      ))}
    </div>
  ),
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '12' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '123' },
};

export const Controlled: Story = {
  render: (args) => {
    const ControlledWrapper = (): React.ReactElement => {
      const [value, setValue] = React.useState('');
      return (
        <div className="flex flex-col gap-3">
          <InputOTP {...args} value={value} onChange={setValue} />
          <span className="text-muted-foreground text-sm">
            value: <code>{value || '(empty)'}</code>
          </span>
        </div>
      );
    };
    return <ControlledWrapper />;
  },
};

export const Alphanumeric: Story = {
  args: {
    pattern: '^[a-zA-Z0-9]+$',
    inputMode: 'text',
    'aria-label': 'Recovery code',
  },
};
