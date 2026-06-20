import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    children: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Badge',
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          {(['primary', 'secondary', 'outline', 'destructive'] as const).map((variant) => (
            <Badge key={`${variant}-${size}`} {...args} variant={variant} size={size}>
              {variant}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};
