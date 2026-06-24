import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Sheet } from './Sheet';

const meta: Meta<typeof Sheet> = {
  title: 'Templates/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    side: 'right',
    size: 'md',
    trigger: <Button>Open sheet</Button>,
    title: 'Settings',
    description: 'Configure your workspace preferences.',
    children: (
      <div className="flex flex-col gap-3 py-4">
        <p>Sheet wraps the Dialog organism and adds a side-anchored frame.</p>
        <p>
          The slot vocabulary is forwarded one-to-one to Dialog; only the
          positioning axis is template-owned.
        </p>
      </div>
    ),
    footer: (
      <>
        <Button variant="outline">Cancel</Button>
        <Button>Apply</Button>
      </>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const Default: Story = {};

export const FromLeft: Story = {
  args: {
    side: 'left',
    trigger: <Button variant="outline">Open from left</Button>,
    title: 'Navigation',
    description: 'Browse the workspace from the left edge.',
  },
};

export const FromTop: Story = {
  args: {
    side: 'top',
    size: 'md',
    trigger: <Button variant="ghost">Open from top</Button>,
    title: 'Announcements',
    description: 'A drop-down banner for short-lived notices.',
    children: (
      <p className="py-2 text-sm text-muted-foreground">
        Top-anchored Sheets stretch across the viewport width and take the
        `size` axis as a height.
      </p>
    ),
  },
};

export const FromBottom: Story = {
  args: {
    side: 'bottom',
    size: 'lg',
    trigger: <Button>Open from bottom</Button>,
    title: 'Filter results',
    description: 'Bottom-anchored Sheets feel sheet-like on touch devices.',
    footer: <Button>Apply</Button>,
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
    description:
      'Use this layout when the Sheet body owns the dismissal flow.',
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

export const AllSides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Sheet
          key={side}
          side={side}
          trigger={<Button variant="outline">{`Side ${side}`}</Button>}
          title={`Side ${side}`}
          description={`The sheet anchors to the ${side} edge.`}
          footer={<Button>Close</Button>}
        >
          <p>
            The `side` axis projects inline positioning onto the composed
            Dialog Content so the surface anchors to the chosen viewport
            edge.
          </p>
        </Sheet>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Sheet
          key={size}
          size={size}
          side="right"
          trigger={<Button>{`Size ${size}`}</Button>}
          title={`Size ${size}`}
          description={`Horizontal sides take the ${size} axis as a width; vertical sides take it as a height.`}
          footer={<Button>Close</Button>}
        >
          <p>The `size` axis also forwards 1:1 to Dialog's `size` axis.</p>
        </Sheet>
      ))}
    </div>
  ),
};
