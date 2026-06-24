import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    placement: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    content: { control: 'text' },
    delayDuration: { control: 'number' },
  },
  args: {
    size: 'md',
    placement: 'top',
    align: 'center',
    trigger: <Button>Hover me</Button>,
    content: 'Helpful tip about this control.',
    delayDuration: 300,
  },
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {};

export const InstantOpen: Story = {
  args: {
    delayDuration: 0,
    content: 'Opens immediately on hover/focus (zero delay).',
  },
};

export const Placements: Story = {
  render: (args) => (
    <div className="grid grid-cols-2 gap-12 p-24">
      {(['top', 'right', 'bottom', 'left'] as const).map((p) => (
        <Tooltip
          key={p}
          {...args}
          placement={p}
          trigger={<Button variant="outline">{p}</Button>}
          content={`Anchored to the ${p} side of the trigger.`}
        />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex gap-4">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <Tooltip
          key={s}
          {...args}
          size={s}
          trigger={<Button>{`Size ${s}`}</Button>}
          content={`Sized via the ${s} axis — max-width and padding scale with the size.`}
        />
      ))}
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    size: 'lg',
    content:
      'Tooltips wrap to multiple lines inside the max-width cap. Keep the body short — '
      + 'tooltips are not the place for rich layout or sustained reading.',
  },
};
