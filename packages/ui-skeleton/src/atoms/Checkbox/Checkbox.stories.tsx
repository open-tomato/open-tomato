import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    size: 'md',
    label: 'Accept terms and conditions',
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Unlabeled: Story = {
  args: {
    label: undefined,
    'aria-label': 'Toggle option',
  },
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { checked: 'indeterminate' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Checkbox key={size} {...args} size={size} label={`Size ${size}`} />
      ))}
    </div>
  ),
};
