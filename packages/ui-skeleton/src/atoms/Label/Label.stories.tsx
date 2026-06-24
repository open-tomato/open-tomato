import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'Atoms/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    required: { control: 'boolean' },
    requiredIndicator: { control: 'text' },
  },
  args: {
    size: 'md',
    required: false,
    children: 'Email address',
  },
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { htmlFor: 'label-default' },
};

export const Required: Story = {
  args: { htmlFor: 'label-required', required: true },
};

export const CustomIndicator: Story = {
  args: {
    htmlFor: 'label-custom-indicator',
    required: true,
    requiredIndicator: '(required)',
  },
};

export const WithAssociatedInput: Story = {
  args: { htmlFor: 'label-input', required: true },
  render: (args) => (
    <div className="flex flex-col gap-1.5">
      <Label {...args} />
      <input
        id="label-input"
        type="email"
        required
        aria-required
        placeholder="you@example.com"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  ),
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <Label {...args} size={size} htmlFor={`label-${size}`}>
            {`Size ${size}`}
          </Label>
          <Label {...args} size={size} required htmlFor={`label-${size}-required`}>
            {`Size ${size} (required)`}
          </Label>
        </div>
      ))}
    </div>
  ),
};
