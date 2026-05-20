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
    className: { control: 'text' },
  },
  args: {
    variant: 'rect',
    animate: 'pulse',
    className: 'h-8 w-48',
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
            animate: {animate}
          </span>
          <div className="flex items-center gap-4">
            <Skeleton {...args} variant="rect" animate={animate} className="h-12 w-48" />
            <Skeleton {...args} variant="circle" animate={animate} className="size-12" />
            <div className="flex w-48 flex-col gap-2">
              <Skeleton {...args} variant="text" animate={animate} className="w-full" />
              <Skeleton {...args} variant="text" animate={animate} className="w-3/4" />
              <Skeleton {...args} variant="text" animate={animate} className="w-1/2" />
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
        <Skeleton {...args} variant="circle" className="size-10" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton {...args} variant="text" className="w-3/4" />
          <Skeleton {...args} variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton {...args} variant="rect" className="h-32 w-full" />
      <Skeleton {...args} variant="text" className="w-full" />
      <Skeleton {...args} variant="text" className="w-5/6" />
    </div>
  ),
};
