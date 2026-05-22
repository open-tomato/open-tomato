import type { Meta, StoryObj } from '@storybook/react';

import { NativeSelect, type NativeSelectOptionDescriptor } from './NativeSelect';

const fruits: NativeSelectOptionDescriptor[] = [
  { type: 'option', value: 'apple', label: 'Apple' },
  { type: 'option', value: 'banana', label: 'Banana' },
  { type: 'option', value: 'orange', label: 'Orange' },
  { type: 'option', value: 'cherry', label: 'Cherry', disabled: true },
];

const grouped: NativeSelectOptionDescriptor[] = [
  {
    type: 'group',
    label: 'Citrus',
    options: [
      { type: 'option', value: 'lemon', label: 'Lemon' },
      { type: 'option', value: 'lime', label: 'Lime' },
      { type: 'option', value: 'orange', label: 'Orange' },
    ],
  },
  {
    type: 'group',
    label: 'Berries',
    options: [
      { type: 'option', value: 'strawberry', label: 'Strawberry' },
      { type: 'option', value: 'blueberry', label: 'Blueberry' },
    ],
  },
];

const meta: Meta<typeof NativeSelect> = {
  title: 'Molecules/NativeSelect',
  component: NativeSelect,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'error', 'success'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    density: { control: 'select', options: ['comfortable', 'compact'] },
    tone: { control: 'select', options: ['neutral', 'subtle', 'inverted'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    'variant': 'default',
    'size': 'md',
    'density': 'comfortable',
    'tone': 'neutral',
    'placeholder': 'Pick a fruit',
    'defaultValue': '',
    'options': fruits,
    'aria-label': 'Fruit',
  },
};
export default meta;

type Story = StoryObj<typeof NativeSelect>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: 'banana',
    placeholder: undefined,
  },
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-72">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <NativeSelect
          key={s}
          {...args}
          size={s}
          placeholder={`Size ${s}`}
          aria-label={`Fruit (${s})`}
        />
      ))}
    </div>
  ),
};

export const Validation: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-72">
      {(['default', 'error', 'success'] as const).map((v) => (
        <NativeSelect
          key={v}
          {...args}
          variant={v}
          placeholder={`Variant ${v}`}
          aria-label={`Fruit (${v})`}
        />
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3 w-72">
      {(['neutral', 'subtle', 'inverted'] as const).map((t) => (
        <NativeSelect
          key={t}
          {...args}
          tone={t}
          placeholder={`Tone ${t}`}
          aria-label={`Fruit (${t})`}
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

export const WithLeadingIcon: Story = {
  args: {
    leadingIcon: <span aria-hidden>🍎</span>,
  },
};

export const WithOptgroup: Story = {
  args: {
    options: grouped,
    placeholder: 'Pick a fruit',
  },
};

export const WithRawChildren: Story = {
  render: (args) => (
    <NativeSelect {...args} options={undefined} placeholder={undefined} defaultValue="">
      <option value="" disabled hidden>Pick a region</option>
      <option value="emea">EMEA</option>
      <option value="amer">Americas</option>
      <option value="apac">APAC</option>
    </NativeSelect>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'banana',
    placeholder: undefined,
  },
};
