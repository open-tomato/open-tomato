import type { Meta, StoryObj } from '@storybook/react';

import { Kbd } from './Kbd';

const meta: Meta<typeof Kbd> = {
  title: 'Atoms/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['outline', 'solid', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    children: { control: 'text' },
  },
  args: {
    variant: 'outline',
    size: 'md',
    children: 'K',
  },
};
export default meta;

type Story = StoryObj<typeof Kbd>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          {(['outline', 'solid', 'ghost'] as const).map((variant) => (
            <Kbd key={`${variant}-${size}`} {...args} variant={variant} size={size}>
              {variant}
            </Kbd>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Shortcut: Story = {
  render: (args) => (
    <span className="text-sm text-foreground">
      Press
      {' '}
      <Kbd {...args}>Ctrl</Kbd>
      {' + '}
      <Kbd {...args}>K</Kbd>
      {' '}
      to open the command bar.
    </span>
  ),
};
