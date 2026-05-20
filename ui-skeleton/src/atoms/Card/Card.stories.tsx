import type { Meta, StoryObj } from '@storybook/react';

import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Atoms/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    variant: 'default',
    padding: 'md',
    title: 'Card title',
    description: 'Short supporting description for the card.',
    children: 'Body content goes here.',
  },
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {};

export const WithFooter: Story = {
  args: {
    footer: 'Footer content',
  },
};

export const ContentOnly: Story = {
  args: {
    title: undefined,
    description: undefined,
  },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(['none', 'sm', 'md', 'lg'] as const).map((padding) => (
        <div key={padding} className="flex flex-wrap items-start gap-4">
          {(['default', 'elevated', 'outlined'] as const).map((variant) => (
            <Card
              key={`${variant}-${padding}`}
              {...args}
              variant={variant}
              padding={padding}
              title={`${variant} / ${padding}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
