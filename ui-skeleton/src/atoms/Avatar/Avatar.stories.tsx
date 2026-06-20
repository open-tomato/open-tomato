import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Atoms/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    shape: {
      control: 'select',
      options: ['circle', 'square'],
    },
    src: { control: 'text' },
    alt: { control: 'text' },
    fallback: { control: 'text' },
  },
  args: {
    size: 'md',
    shape: 'circle',
    src: 'https://i.pravatar.cc/96?u=open-tomato',
    alt: 'Sample avatar',
    fallback: 'MT',
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const FallbackOnly: Story = {
  args: { src: undefined, alt: undefined },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['circle', 'square'] as const).map((shape) => (
        <div key={shape} className="flex items-end gap-4">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Avatar key={`${shape}-${size}`} {...args} size={size} shape={shape} />
          ))}
        </div>
      ))}
    </div>
  ),
};
