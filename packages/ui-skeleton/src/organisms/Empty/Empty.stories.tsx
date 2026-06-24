import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Empty } from './Empty';

const meta: Meta<typeof Empty> = {
  title: 'Organisms/Empty',
  component: Empty,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'inline-radio', options: ['neutral', 'info'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    size: 'md',
    tone: 'neutral',
    title: 'No messages yet',
    description: 'Conversations will appear here once they arrive.',
  },
};
export default meta;

type Story = StoryObj<typeof Empty>;

export const Default: Story = {};

export const WithLeading: Story = {
  args: {
    leading: <span aria-hidden>i</span>,
  },
};

export const WithActions: Story = {
  args: {
    leading: <span aria-hidden>i</span>,
    actions: (
      <>
        <Button variant="ghost">Clear filters</Button>
        <Button variant="primary">Reset search</Button>
      </>
    ),
  },
};

export const InfoTone: Story = {
  args: {
    tone: 'info',
    leading: <span aria-hidden>i</span>,
    title: 'Nothing matched',
    description: 'Try a broader query or clear the active filters.',
  },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-3">
          {(['neutral', 'info'] as const).map((tone) => (
            <Empty
              key={`${tone}-${size}`}
              {...args}
              size={size}
              tone={tone}
              title={`${tone} / ${size}`}
              description="Variant propagation flows into Card padding and Typography variant."
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
