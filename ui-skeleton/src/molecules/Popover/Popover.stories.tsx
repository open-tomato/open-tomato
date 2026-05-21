import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'Molecules/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    placement: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    size: 'md',
    placement: 'bottom',
    align: 'center',
    trigger: <Button>Open popover</Button>,
    title: 'Settings',
    description: 'Tune behavior here.',
    children: 'Body content rendered inside the popover.',
  },
};
export default meta;

type Story = StoryObj<typeof Popover>;

export const Default: Story = {};

export const NoCard: Story = {
  args: {
    title: undefined,
    description: undefined,
    children:
      'Children render directly inside the Content when neither title nor description is set.',
  },
};

export const Placements: Story = {
  render: (args) => (
    <div className="grid grid-cols-2 gap-12 p-24">
      {(['top', 'right', 'bottom', 'left'] as const).map((p) => (
        <Popover
          key={p}
          {...args}
          placement={p}
          trigger={<Button variant="outline">{p}</Button>}
          title={`Placement: ${p}`}
        >
          <p>Anchored to the {p} side of the trigger.</p>
        </Popover>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex gap-4">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <Popover
          key={s}
          {...args}
          size={s}
          trigger={<Button>{`Size ${s}`}</Button>}
          title={`Size ${s}`}
        >
          <p>Sized via the {s} axis.</p>
        </Popover>
      ))}
    </div>
  ),
};
