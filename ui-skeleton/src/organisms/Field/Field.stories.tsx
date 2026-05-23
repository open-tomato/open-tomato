import type { Meta, StoryObj } from '@storybook/react';

import { Field } from './Field';

const meta: Meta<typeof Field> = {
  title: 'Organisms/Field',
  component: Field,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    invalid: false,
    label: 'Email',
    description: 'We\'ll never share your email.',
    placeholder: 'you@example.com',
  },
};
export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const WithLeadingIcon: Story = {
  args: {
    leading: <span aria-hidden>@</span>,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    trailing: <span aria-hidden>×</span>,
  },
};

export const WithIdOverride: Story = {
  args: {
    id: 'email-override',
    description: 'Label htmlFor and Input id are paired to the id prop.',
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
    label: 'Username',
    description: '3-32 characters',
    error: 'That username is taken.',
    defaultValue: 'taken',
    placeholder: undefined,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'locked@example.com',
  },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-4">
          <Field
            {...args}
            size={size}
            invalid={false}
            label={`Default / ${size}`}
            description="Helper text"
            error={undefined}
          />
          <Field
            {...args}
            size={size}
            invalid
            label={`Invalid / ${size}`}
            description="3-32 characters"
            error="That username is taken."
            defaultValue="taken"
            placeholder={undefined}
          />
        </div>
      ))}
    </div>
  ),
};
