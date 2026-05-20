import type { Meta, StoryObj } from '@storybook/react';

import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Atoms/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'success', 'warning', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    max: { control: 'number' },
  },
  args: {
    variant: 'default',
    size: 'md',
    value: 42,
    max: 100,
    'aria-label': 'Loading',
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {};

export const Complete: Story = {
  args: { value: 100, variant: 'success' },
};

export const Warning: Story = {
  args: { value: 80, variant: 'warning' },
};

export const Destructive: Story = {
  args: { value: 65, variant: 'destructive' },
};

export const Indeterminate: Story = {
  args: { value: null },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-4">
      {(['default', 'success', 'warning', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {variant}
          </span>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Progress
              key={`${variant}-${size}`}
              {...args}
              variant={variant}
              size={size}
              aria-label={`${variant} ${size}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
