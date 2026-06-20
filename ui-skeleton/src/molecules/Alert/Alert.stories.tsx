import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Molecules/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    severity: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    severity: 'info',
    size: 'md',
    title: 'Heads up',
    description: 'Something noteworthy just happened.',
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-3">
          {(['info', 'success', 'warning', 'error'] as const).map((severity) => (
            <Alert
              key={`${severity}-${size}`}
              {...args}
              severity={severity}
              size={size}
              title={`${severity} / ${size}`}
              description="Variant propagation flows into Card padding and Typography variant."
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const WithCustomHeader: Story = {
  args: {
    title: undefined,
    description: undefined,
    header: (
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-semibold">Custom header layout</span>
          <span className="text-muted-foreground text-sm">
            Replaces the default leading/title/description rendering entirely.
          </span>
        </div>
        <Button size="sm" variant="outline">Dismiss</Button>
      </div>
    ),
    children: 'Body content renders beneath the custom header.',
  },
};

export const WithActions: Story = {
  args: {
    severity: 'warning',
    leading: <span aria-hidden>!</span>,
    title: 'Unsaved changes',
    description: 'You have edits that have not been saved yet.',
    actions: (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost">Discard</Button>
        <Button size="sm" variant="primary">Save</Button>
      </div>
    ),
  },
};
