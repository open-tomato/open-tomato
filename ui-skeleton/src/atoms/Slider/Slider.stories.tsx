import type { Meta, StoryObj } from '@storybook/react';

import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  title: 'Atoms/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
  args: {
    defaultValue: [50],
    min: 0,
    max: 100,
    step: 1,
    'aria-label': 'Slider',
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {};

export const Range: Story = {
  args: { defaultValue: [20, 80], 'aria-label': 'Range' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical', defaultValue: [40], 'aria-label': 'Vertical' },
  decorators: [
    (Story) => (
      <div className="flex h-72 justify-center">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: { disabled: true, 'aria-label': 'Disabled' },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-3">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {size}
          </span>
          <Slider {...args} size={size} aria-label={`${size} single`} />
          <Slider
            {...args}
            size={size}
            defaultValue={[20, 80]}
            aria-label={`${size} range`}
          />
        </div>
      ))}
    </div>
  ),
};
