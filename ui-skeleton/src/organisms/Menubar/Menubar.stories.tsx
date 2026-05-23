import type { Meta, StoryObj } from '@storybook/react';

import { Menubar, type MenubarItem } from './Menubar';

const baseItems: MenubarItem[] = [
  {
    type: 'menu',
    value: 'file',
    label: 'File',
    items: [
      { type: 'item', value: 'new', label: 'New' },
      { type: 'item', value: 'open', label: 'Open…' },
      { type: 'separator' },
      { type: 'item', value: 'save', label: 'Save' },
      { type: 'item', value: 'save-as', label: 'Save as…' },
      { type: 'separator' },
      { type: 'item', value: 'exit', label: 'Exit' },
    ],
  },
  {
    type: 'menu',
    value: 'edit',
    label: 'Edit',
    items: [
      { type: 'label', label: 'Clipboard' },
      {
        type: 'item',
        value: 'cut',
        label: 'Cut',
        trailing: <span aria-hidden>⌘X</span>,
      },
      {
        type: 'item',
        value: 'copy',
        label: 'Copy',
        trailing: <span aria-hidden>⌘C</span>,
      },
      {
        type: 'item',
        value: 'paste',
        label: 'Paste',
        trailing: <span aria-hidden>⌘V</span>,
      },
      { type: 'separator' },
      {
        type: 'group',
        label: 'History',
        items: [
          { type: 'item', value: 'undo', label: 'Undo' },
          { type: 'item', value: 'redo', label: 'Redo', disabled: true },
        ],
      },
    ],
  },
  {
    type: 'menu',
    value: 'view',
    label: 'View',
    items: [
      { type: 'item', value: 'zoom-in', label: 'Zoom in' },
      { type: 'item', value: 'zoom-out', label: 'Zoom out' },
      { type: 'item', value: 'fullscreen', label: 'Fullscreen' },
    ],
  },
  {
    type: 'menu',
    value: 'help',
    label: 'Help',
    disabled: true,
    items: [
      { type: 'item', value: 'docs', label: 'Documentation' },
    ],
  },
];

const meta: Meta<typeof Menubar> = {
  title: 'Organisms/Menubar',
  component: Menubar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    density: { control: 'inline-radio', options: ['compact', 'comfortable'] },
  },
  args: {
    size: 'md',
    density: 'comfortable',
    items: baseItems,
  },
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Menubar>;

export const Default: Story = {};

export const Compact: Story = {
  args: { density: 'compact' },
};

export const SmallSize: Story = {
  args: { size: 'sm' },
};

export const LargeSize: Story = {
  args: { size: 'lg' },
};

export const AllDensities: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['comfortable', 'compact'] as const).map((density) => (
        <Menubar key={density} {...args} density={density} />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Menubar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};
