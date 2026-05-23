import type { Meta, StoryObj } from '@storybook/react';

import { Resizable, type ResizableItem } from './Resizable';

const horizontalItems: ResizableItem[] = [
  {
    type: 'panel',
    id: 'nav',
    defaultSize: 25,
    minSize: 15,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
        Navigation
      </div>
    ),
  },
  {
    type: 'handle',
    withHandle: true,
  },
  {
    type: 'panel',
    id: 'main',
    defaultSize: 75,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/10 p-6 text-sm font-medium text-foreground">
        Main content
      </div>
    ),
  },
];

const verticalItems: ResizableItem[] = [
  {
    type: 'panel',
    id: 'top',
    defaultSize: 60,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
        Top
      </div>
    ),
  },
  {
    type: 'handle',
  },
  {
    type: 'panel',
    id: 'bottom',
    defaultSize: 40,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/10 p-6 text-sm font-medium text-foreground">
        Bottom
      </div>
    ),
  },
];

const threeColumnItems: ResizableItem[] = [
  {
    type: 'panel',
    id: 'left',
    defaultSize: 20,
    minSize: 10,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
        Left
      </div>
    ),
  },
  { type: 'handle', withHandle: true },
  {
    type: 'panel',
    id: 'middle',
    defaultSize: 50,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/10 p-6 text-sm font-medium text-foreground">
        Middle
      </div>
    ),
  },
  { type: 'handle', withHandle: true },
  {
    type: 'panel',
    id: 'right',
    defaultSize: 30,
    minSize: 10,
    content: (
      <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
        Right
      </div>
    ),
  },
];

const meta: Meta<typeof Resizable> = {
  title: 'Organisms/Resizable',
  component: Resizable,
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    direction: 'horizontal',
    items: horizontalItems,
  },
  decorators: [
    (Story) => (
      <div className="h-64 w-full max-w-3xl rounded-md border border-border">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Resizable>;

export const Default: Story = {};

export const Vertical: Story = {
  args: {
    direction: 'vertical',
    items: verticalItems,
  },
};

export const ThreeColumns: Story = {
  args: {
    items: threeColumnItems,
  },
};

export const BareHandle: Story = {
  args: {
    items: [
      {
        type: 'panel',
        id: 'left',
        defaultSize: 50,
        content: (
          <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
            Left
          </div>
        ),
      },
      { type: 'handle', withHandle: false },
      {
        type: 'panel',
        id: 'right',
        defaultSize: 50,
        content: (
          <div className="flex h-full items-center justify-center bg-muted/10 p-6 text-sm font-medium text-foreground">
            Right
          </div>
        ),
      },
    ],
  },
};

export const DisabledHandle: Story = {
  args: {
    items: [
      {
        type: 'panel',
        id: 'left',
        defaultSize: 40,
        content: (
          <div className="flex h-full items-center justify-center bg-muted/40 p-6 text-sm font-medium text-foreground">
            Locked left
          </div>
        ),
      },
      { type: 'handle', withHandle: true, disabled: true },
      {
        type: 'panel',
        id: 'right',
        defaultSize: 60,
        content: (
          <div className="flex h-full items-center justify-center bg-muted/10 p-6 text-sm font-medium text-foreground">
            Locked right
          </div>
        ),
      },
    ],
  },
};

export const BothDirections: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="h-48 w-full max-w-3xl rounded-md border border-border">
        <Resizable direction="horizontal" items={horizontalItems} />
      </div>
      <div className="h-64 w-full max-w-3xl rounded-md border border-border">
        <Resizable direction="vertical" items={verticalItems} />
      </div>
    </div>
  ),
};
