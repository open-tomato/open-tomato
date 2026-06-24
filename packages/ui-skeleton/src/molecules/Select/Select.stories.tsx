import type { Meta, StoryObj } from '@storybook/react';

import { Select, type SelectItemDescriptor } from './Select';

const fruits: SelectItemDescriptor[] = [
  { type: 'item', value: 'apple', label: 'Apple' },
  { type: 'item', value: 'banana', label: 'Banana' },
  { type: 'item', value: 'orange', label: 'Orange' },
  { type: 'separator' },
  { type: 'item', value: 'cherry', label: 'Cherry', disabled: true },
];

const meta: Meta<typeof Select> = {
  title: 'Molecules/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'error', 'success'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    density: { control: 'select', options: ['comfortable', 'compact'] },
    tone: { control: 'select', options: ['neutral', 'subtle', 'inverted'] },
    placeholder: { control: 'text' },
  },
  args: {
    variant: 'default',
    size: 'md',
    density: 'comfortable',
    tone: 'neutral',
    placeholder: 'Pick a fruit',
    items: fruits,
    triggerProps: { 'aria-label': 'Fruit' },
  },
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: 'banana',
  },
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 w-72">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <Select
          key={s}
          {...args}
          size={s}
          placeholder={`Size ${s}`}
          triggerProps={{ 'aria-label': `Fruit (${s})` }}
        />
      ))}
    </div>
  ),
};

export const Validation: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 w-72">
      {(['default', 'error', 'success'] as const).map((v) => (
        <Select
          key={v}
          {...args}
          variant={v}
          placeholder={`Variant ${v}`}
          triggerProps={{ 'aria-label': `Fruit (${v})` }}
        />
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 w-72">
      {(['neutral', 'subtle', 'inverted'] as const).map((t) => (
        <Select
          key={t}
          {...args}
          tone={t}
          placeholder={`Tone ${t}`}
          triggerProps={{ 'aria-label': `Fruit (${t})` }}
        />
      ))}
    </div>
  ),
};

export const Compact: Story = {
  args: {
    density: 'compact',
  },
};

export const CustomTrigger: Story = {
  args: {
    trigger: (
      <button
        type="button"
        aria-label="Custom fruit picker"
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-1.5 text-sm"
      >
        Choose…
      </button>
    ),
  },
};
