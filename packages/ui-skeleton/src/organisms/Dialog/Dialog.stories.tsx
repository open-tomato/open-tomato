import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Dialog } from './Dialog';

const meta: Meta<typeof Dialog> = {
  title: 'Organisms/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    tone: { control: 'inline-radio', options: ['neutral', 'info'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    size: 'md',
    tone: 'neutral',
    trigger: <Button>Open dialog</Button>,
    title: 'Edit profile',
    description: 'Update the public information shown on your profile.',
    children: (
      <div className="flex flex-col gap-3 py-4">
        <p>The dialog body owns the content between the header and the footer.</p>
        <p>Radix handles focus trapping, escape dismissal, and outside-click dismissal.</p>
      </div>
    ),
    footer: (
      <>
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};

export const InfoTone: Story = {
  args: {
    tone: 'info',
    size: 'lg',
    trigger: <Button variant="ghost">What's new</Button>,
    title: 'What\'s new this week',
    description: 'A summary of the latest workspace updates.',
    children: (
      <ul className="list-disc pl-5 py-2 text-sm">
        <li>Filters now persist across sessions.</li>
        <li>Bulk edit lands behind a flag.</li>
        <li>The activity feed loads incrementally.</li>
      </ul>
    ),
    footer: <Button>Got it</Button>,
  },
};

export const NoDescription: Story = {
  args: {
    title: 'Confirm action?',
    description: undefined,
  },
};

export const NoFooter: Story = {
  args: {
    footer: undefined,
    description: 'Use this layout when the dialog body owns the dismissal flow.',
  },
};

export const WithCustomHeader: Story = {
  args: {
    title: 'Profile',
    description: undefined,
    header: (
      <div className="flex items-center gap-3">
        <span aria-hidden className="size-10 rounded-full bg-primary/10" />
        <div>
          <p className="text-base font-semibold leading-tight">Marcos</p>
          <p className="text-sm text-muted-foreground">marcos@example.com</p>
        </div>
      </div>
    ),
    footer: <Button>Edit details</Button>,
  },
};

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Dialog
          key={size}
          size={size}
          trigger={<Button>{`Size ${size}`}</Button>}
          title={`Size ${size}`}
          description={`Content width and surface padding tuned by the ${size} axis.`}
          footer={<Button>Close</Button>}
        >
          <p>The {size} axis sets the Content max-width and surface padding.</p>
        </Dialog>
      ))}
    </div>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['neutral', 'info'] as const).map((tone) => (
        <Dialog
          key={tone}
          tone={tone}
          trigger={<Button variant="outline">{`Tone ${tone}`}</Button>}
          title={`Tone ${tone}`}
          description={`The ${tone} tone routes through the surface cva descendant selector.`}
          footer={<Button>Close</Button>}
        >
          <p>Tone neutral keeps `text-foreground`; tone info promotes the title to `text-primary`.</p>
        </Dialog>
      ))}
    </div>
  ),
};
