import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['rect', 'circle', 'text'],
    },
    animate: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
    },
    width: { control: 'text' },
    height: { control: 'text' },
    size: { control: 'text' },
  },
  args: {
    variant: 'rect',
    animate: 'pulse',
    width: 192,
    height: 32,
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(['pulse', 'wave', 'none'] as const).map((animate) => (
        <div key={animate} className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            animate:
            {' '}
            {animate}
          </span>
          <div className="flex items-center gap-4">
            <Skeleton {...args} variant="rect" animate={animate} width={192} height={48} />
            <Skeleton {...args} variant="circle" animate={animate} size={48} />
            <div className="flex w-48 flex-col gap-2">
              <Skeleton {...args} variant="text" animate={animate} width="100%" />
              <Skeleton {...args} variant="text" animate={animate} width="75%" />
              <Skeleton {...args} variant="text" animate={animate} width="50%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center gap-3">
        <Skeleton {...args} variant="circle" size={40} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton {...args} variant="text" width="75%" />
          <Skeleton {...args} variant="text" width="50%" />
        </div>
      </div>
      <Skeleton {...args} variant="rect" width="100%" height={128} />
      <Skeleton {...args} variant="text" width="100%" />
      <Skeleton {...args} variant="text" width="83%" />
    </div>
  ),
};
