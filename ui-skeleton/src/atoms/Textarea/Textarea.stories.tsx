import type { Meta, StoryObj } from '@storybook/react';

import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Atoms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    density: {
      control: 'select',
      options: ['comfortable', 'compact'],
    },
    tone: {
      control: 'select',
      options: ['neutral', 'subtle', 'inverted'],
    },
    disabled: { control: 'boolean' },
    autoResize: { control: 'boolean' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
  },
  args: {
    variant: 'default',
    size: 'md',
    density: 'comfortable',
    tone: 'neutral',
    placeholder: 'Write something…',
    disabled: false,
    autoResize: false,
  },
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          {(['default', 'error', 'success'] as const).map((variant) => (
            <Textarea
              key={`${variant}-${size}`}
              {...args}
              variant={variant}
              size={size}
              placeholder={`${variant} / ${size}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const DensityToneMatrix: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['comfortable', 'compact'] as const).map((density) => (
        <div key={density} className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            density: {density}
          </div>
          <div className="flex flex-col gap-2">
            {(['neutral', 'subtle', 'inverted'] as const).map((tone) => (
              <Textarea
                key={`${density}-${tone}`}
                {...args}
                density={density}
                tone={tone}
                placeholder={`${density} / ${tone}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Error: Story = {
  args: { variant: 'error', defaultValue: 'too short' },
};

export const Success: Story = {
  args: { variant: 'success', defaultValue: 'Looks good!' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'read only' },
};

export const AutoResize: Story = {
  args: {
    autoResize: true,
    placeholder: 'Type multiple lines and watch the field grow…',
  },
};

export const FixedRows: Story = {
  args: { rows: 8 },
};
