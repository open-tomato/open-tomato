import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Drawer } from './Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'Organisms/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    side: 'right',
    size: 'md',
    trigger: <Button>Open drawer</Button>,
    title: 'Settings',
    description: 'Configure your workspace preferences.',
    children: (
      <div className="flex flex-col gap-3 py-4">
        <p>The drawer body owns the scrollable region between the header and the footer.</p>
        <p>vaul handles the swipe-to-dismiss gesture and the side anchoring.</p>
      </div>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof Drawer>;

export const Default: Story = {};

export const BottomSheet: Story = {
  args: {
    side: 'bottom',
    size: 'lg',
    title: 'Filter results',
    description: 'Narrow the visible items by attribute.',
    footer: (
      <>
        <Button variant="outline">Cancel</Button>
        <Button>Apply</Button>
      </>
    ),
  },
};

export const LeftPanel: Story = {
  args: {
    side: 'left',
    size: 'md',
    trigger: <Button variant="outline">Open navigation</Button>,
    title: 'Navigation',
    description: 'Jump to a workspace section.',
  },
};

export const TopBanner: Story = {
  args: {
    side: 'top',
    size: 'sm',
    trigger: <Button variant="ghost">Open notifications</Button>,
    title: 'Notifications',
    description: 'Recent activity in your workspace.',
  },
};

export const WithCustomHeader: Story = {
  args: {
    side: 'right',
    title: 'Profile',
    description: undefined,
    header: (
      <div className="flex items-center gap-3">
        <span aria-hidden className="size-10 rounded-full bg-primary/10" />
        <div>
          <p className="text-base font-semibold leading-tight">Marcos</p>
          <p className="text-sm text-muted-foreground">marcos@example.com</p>
        </div>
      </div>
    ),
  },
};

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
};

export const AllSides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Drawer
          key={side}
          side={side}
          trigger={<Button variant="outline">{`Side ${side}`}</Button>}
          title={`Side ${side}`}
          description={`Content anchored to the ${side} edge.`}
        >
          <p>vaul's gesture math respects the {side} axis for swipe-to-dismiss.</p>
        </Drawer>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Drawer
          key={size}
          size={size}
          trigger={<Button>{`Size ${size}`}</Button>}
          title={`Size ${size}`}
          description={`Width tuned by the ${size} axis.`}
        >
          <p>Cross-axis dimension scales with size. Horizontal sides take the value as a width.</p>
        </Drawer>
      ))}
    </div>
  ),
};
