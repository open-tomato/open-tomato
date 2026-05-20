import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
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
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'tel', 'url', 'number'],
    },
  },
  args: {
    variant: 'default',
    size: 'md',
    placeholder: 'Type something…',
    disabled: false,
    type: 'text',
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          {(['default', 'error', 'success'] as const).map((variant) => (
            <Input
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

export const WithIcons: Story = {
  args: {
    placeholder: 'Search…',
    leadingIcon: <span aria-hidden>🔍</span>,
    trailingIcon: <span aria-hidden>⌘K</span>,
  },
};

export const Error: Story = {
  args: { variant: 'error', defaultValue: 'not-an-email' },
};

export const Success: Story = {
  args: { variant: 'success', defaultValue: 'user@example.com' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'read only' },
};
