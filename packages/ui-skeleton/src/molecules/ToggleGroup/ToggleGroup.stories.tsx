import type { Meta, StoryObj } from '@storybook/react';

import { ToggleGroup } from './ToggleGroup';

const meta: Meta<typeof ToggleGroup> = {
  title: 'Molecules/ToggleGroup',
  component: ToggleGroup,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    type: { control: 'inline-radio', options: ['single', 'multiple'] },
    disabled: { control: 'boolean' },
  },
  args: {
    'aria-label': 'Text alignment',
    type: 'single',
    size: 'md',
    variant: 'default',
    orientation: 'horizontal',
    disabled: false,
    defaultValue: 'left',
    items: [
      { value: 'left', label: 'Left', ariaLabel: 'Align left' },
      { value: 'center', label: 'Center', ariaLabel: 'Align center' },
      { value: 'right', label: 'Right', ariaLabel: 'Align right' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Multiple: Story = {
  args: {
    type: 'multiple',
    'aria-label': 'Text style',
    defaultValue: ['bold'],
    items: [
      { value: 'bold', label: 'B', ariaLabel: 'Bold' },
      { value: 'italic', label: 'I', ariaLabel: 'Italic' },
      { value: 'underline', label: 'U', ariaLabel: 'Underline' },
    ],
  },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <ToggleGroup
          key={size}
          type="single"
          aria-label={`Alignment (${size})`}
          size={size}
          defaultValue="left"
          items={[
            { value: 'left', label: 'Left', ariaLabel: `Align left (${size})` },
            { value: 'center', label: 'Center', ariaLabel: `Align center (${size})` },
            { value: 'right', label: 'Right', ariaLabel: `Align right (${size})` },
          ]}
        />
      ))}
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['default', 'outline'] as const).map((variant) => (
        <ToggleGroup
          key={variant}
          type="single"
          aria-label={`Alignment (${variant})`}
          variant={variant}
          defaultValue="left"
          items={[
            { value: 'left', label: 'Left', ariaLabel: `Align left (${variant})` },
            { value: 'center', label: 'Center', ariaLabel: `Align center (${variant})` },
            { value: 'right', label: 'Right', ariaLabel: `Align right (${variant})` },
          ]}
        />
      ))}
    </div>
  ),
};

export const WithDisabledItem: Story = {
  args: {
    items: [
      { value: 'left', label: 'Left', ariaLabel: 'Align left' },
      { value: 'center', label: 'Center', ariaLabel: 'Align center' },
      { value: 'right', label: 'Right', ariaLabel: 'Align right', disabled: true },
    ],
  },
};

export const DisabledGroup: Story = {
  args: { disabled: true },
};
