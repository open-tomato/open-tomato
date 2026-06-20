import type { Meta, StoryObj } from '@storybook/react';

import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Molecules/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'inline-radio',
      options: ['default', 'success', 'destructive'],
    },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
  args: {
    size: 'md',
    variant: 'default',
    label: 'Email notifications',
    disabled: false,
    defaultChecked: false,
  },
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const WithoutLabel: Story = {
  args: { label: undefined, 'aria-label': 'Wi-Fi' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Switch key={size} size={size} label={`Size ${size}`} defaultChecked />
      ))}
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['default', 'success', 'destructive'] as const).map((variant) => (
        <Switch
          key={variant}
          variant={variant}
          label={`Variant: ${variant}`}
          defaultChecked
        />
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, label: 'Cannot toggle' },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true, label: 'Locked on' },
};
