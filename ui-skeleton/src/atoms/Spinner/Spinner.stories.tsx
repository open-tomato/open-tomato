import type { Meta, StoryObj } from '@storybook/react';

import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Atoms/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'muted', 'primary', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    label: { control: 'text' },
  },
  args: {
    variant: 'default',
    size: 'md',
    label: 'Loading',
  },
};
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['default', 'muted', 'primary', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-6">
          <span className="text-muted-foreground w-28 text-xs uppercase tracking-wide">
            {variant}
          </span>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Spinner key={`${variant}-${size}`} {...args} variant={variant} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Decorative: Story = {
  args: { label: '' },
  render: (args) => (
    <span className="text-foreground inline-flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <Spinner {...args} size="sm" />
      Saving your changes…
    </span>
  ),
};

export const InlineWithText: Story = {
  render: (args) => (
    <p className="text-foreground text-sm">
      Fetching results
      {' '}
      <Spinner {...args} size="sm" />
    </p>
  ),
};
