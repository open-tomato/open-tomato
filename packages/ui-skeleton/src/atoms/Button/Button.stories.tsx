import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    asChild: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    children: 'Button',
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          {(['primary', 'secondary', 'outline', 'ghost', 'destructive'] as const).map((variant) => (
            <Button key={`${variant}-${size}`} {...args} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true, children: 'Saving…' },
};

export const WithIcons: Story = {
  args: {
    children: 'Send',
    leadingIcon: <span aria-hidden>→</span>,
    trailingIcon: <span aria-hidden>✓</span>,
  },
};

export const AsChildLink: Story = {
  args: { asChild: true, variant: 'outline' },
  render: (args) => (
    <Button {...args}>
      <a href="#home">Render as &lt;a&gt;</a>
    </Button>
  ),
};
