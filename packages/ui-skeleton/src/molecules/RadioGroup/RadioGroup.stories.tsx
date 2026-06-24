import type { Meta, StoryObj } from '@storybook/react';

import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Molecules/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
  },
  args: {
    'aria-label': 'Plan',
    size: 'md',
    orientation: 'vertical',
    disabled: false,
    defaultValue: 'pro',
    items: [
      { value: 'starter', label: 'Starter', description: 'Up to 10 seats' },
      { value: 'pro', label: 'Pro', description: 'Up to 100 seats' },
      { value: 'enterprise', label: 'Enterprise', description: 'Unlimited seats' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <RadioGroup
          key={size}
          aria-label={`Plan (${size})`}
          size={size}
          defaultValue="pro"
          items={[
            { value: 'starter', label: `Starter (${size})` },
            { value: 'pro', label: `Pro (${size})` },
          ]}
        />
      ))}
    </div>
  ),
};

export const WithDisabledItem: Story = {
  args: {
    items: [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      {
        value: 'legacy',
        label: 'Legacy',
        description: 'No longer offered',
        disabled: true,
      },
    ],
  },
};

export const LabelOnly: Story = {
  args: {
    items: [
      { value: 'one', label: 'Option one' },
      { value: 'two', label: 'Option two' },
      { value: 'three', label: 'Option three' },
    ],
  },
};
