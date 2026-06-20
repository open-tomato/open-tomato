import type { Meta, StoryObj } from '@storybook/react';

import { Separator } from './Separator';

const meta: Meta<typeof Separator> = {
  title: 'Atoms/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['default', 'subtle', 'strong'] },
    decorative: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    variant: 'default',
    decorative: true,
  },
};
export default meta;

type Story = StoryObj<typeof Separator>;

export const Default: Story = {
  render: (args) => (
    <div className="w-72">
      <div className="text-sm">Section A</div>
      <Separator {...args} />
      <div className="text-sm">Section B</div>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div className="flex h-12 items-center gap-3 text-sm">
      <span>Docs</span>
      <Separator {...args} />
      <span>Source</span>
      <Separator {...args} />
      <span>Settings</span>
    </div>
  ),
};

export const Subtle: Story = {
  args: { variant: 'subtle' },
  render: (args) => (
    <div className="w-72">
      <div className="text-sm">Section A</div>
      <Separator {...args} />
      <div className="text-sm">Section B</div>
    </div>
  ),
};

export const Strong: Story = {
  args: { variant: 'strong' },
  render: (args) => (
    <div className="w-72">
      <div className="text-sm">Section A</div>
      <Separator {...args} />
      <div className="text-sm">Section B</div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          horizontal
        </span>
        <div className="flex w-72 flex-col gap-3">
          {(['default', 'subtle', 'strong'] as const).map((variant) => (
            <div key={variant} className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">{variant}</span>
              <Separator variant={variant} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          vertical
        </span>
        <div className="flex h-16 items-center gap-4 text-sm">
          {(['default', 'subtle', 'strong'] as const).map((variant) => (
            <div key={variant} className="flex h-full items-center gap-4">
              <span>{variant}</span>
              <Separator orientation="vertical" variant={variant} />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};
