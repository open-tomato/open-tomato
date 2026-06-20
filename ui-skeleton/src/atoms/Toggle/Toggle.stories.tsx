import type { Meta, StoryObj } from '@storybook/react';

import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Atoms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    defaultPressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    variant: 'default',
    size: 'md',
    'aria-label': 'Toggle bold',
    children: 'B',
  },
};
export default meta;

type Story = StoryObj<typeof Toggle>;

export const Default: Story = {};

export const Pressed: Story = {
  args: { defaultPressed: true },
};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['default', 'outline'] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {variant}
          </span>
          <div className="flex items-center gap-3">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <Toggle key={size} variant={variant} size={size} aria-label={`Toggle ${variant} ${size}`}>
                {size}
              </Toggle>
            ))}
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <Toggle
                key={`${size}-on`}
                variant={variant}
                size={size}
                defaultPressed
                aria-label={`Toggle ${variant} ${size} pressed`}
              >
                {size}
              </Toggle>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
