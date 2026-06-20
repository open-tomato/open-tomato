import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { AlertDialog } from './AlertDialog';

const meta: Meta<typeof AlertDialog> = {
  title: 'Organisms/AlertDialog',
  component: AlertDialog,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    severity: {
      control: 'inline-radio',
      options: ['info', 'warning', 'danger'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    size: 'md',
    severity: 'info',
    trigger: <Button>Open dialog</Button>,
    title: 'Are you sure?',
    description: 'This action cannot be undone.',
    confirmAction: <Button>Confirm</Button>,
    cancelAction: <Button variant="outline">Cancel</Button>,
  },
};
export default meta;

type Story = StoryObj<typeof AlertDialog>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    severity: 'danger',
    trigger: <Button variant="destructive">Delete account</Button>,
    title: 'Delete your account?',
    description:
      'This action is permanent and cannot be undone. All your data will be erased.',
    confirmAction: <Button>Delete account</Button>,
    cancelAction: <Button variant="outline">Keep account</Button>,
  },
};

export const Warning: Story = {
  args: {
    severity: 'warning',
    title: 'You have unsaved changes',
    description: 'Leaving this page will discard them.',
    confirmAction: <Button>Discard and continue</Button>,
    cancelAction: <Button variant="ghost">Stay on page</Button>,
  },
};

export const NoDescription: Story = {
  args: {
    title: 'Confirm action?',
    description: undefined,
  },
};

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
};

export const AllSeverities: Story = {
  render: () => (
    <div className="flex gap-3">
      {(['info', 'warning', 'danger'] as const).map((severity) => (
        <AlertDialog
          key={severity}
          severity={severity}
          trigger={<Button variant="outline">{`Open (${severity})`}</Button>}
          title={`Severity: ${severity}`}
          description={`Confirm Button picks up the ${severity === 'danger'
            ? 'destructive'
            : 'primary'} variant via the severity lookup table.`}
          confirmAction={<Button>Confirm</Button>}
          cancelAction={<Button variant="outline">Cancel</Button>}
        />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <AlertDialog
          key={size}
          size={size}
          trigger={<Button>{`Size ${size}`}</Button>}
          title={`Size ${size}`}
          description={`Content width and surface padding tuned by the ${size} axis.`}
          confirmAction={<Button>Confirm</Button>}
          cancelAction={<Button variant="outline">Cancel</Button>}
        />
      ))}
    </div>
  ),
};
