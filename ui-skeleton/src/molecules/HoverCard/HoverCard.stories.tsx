import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { HoverCard } from './HoverCard';

const meta: Meta<typeof HoverCard> = {
  title: 'Molecules/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    placement: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
  },
  args: {
    size: 'md',
    placement: 'bottom',
    openDelay: 200,
    closeDelay: 150,
    trigger: <Button variant="ghost">@jane</Button>,
    children: (
      <div className="flex flex-col gap-1">
        <strong>Jane Doe</strong>
        <span>Frontend engineer. Joined April 2024.</span>
      </div>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {};

export const Placements: Story = {
  render: (args) => (
    <div className="grid grid-cols-2 gap-12 p-24">
      {(['top', 'right', 'bottom', 'left'] as const).map((p) => (
        <HoverCard
          key={p}
          {...args}
          placement={p}
          trigger={<Button variant="outline">{p}</Button>}
        >
          <p>Anchored to the {p} side of the trigger.</p>
        </HoverCard>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex gap-4">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <HoverCard
          key={s}
          {...args}
          size={s}
          trigger={<Button>{`Size ${s}`}</Button>}
        >
          <p>Sized via the {s} axis.</p>
        </HoverCard>
      ))}
    </div>
  ),
};

export const InstantOpen: Story = {
  args: {
    openDelay: 0,
    closeDelay: 0,
  },
};
