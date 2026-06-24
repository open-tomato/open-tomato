import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';

const baseItems: DropdownMenuItem[] = [
  { type: 'label', label: 'Account' },
  { type: 'item', value: 'profile', label: 'Profile' },
  { type: 'item', value: 'billing', label: 'Billing' },
  { type: 'item', value: 'settings', label: 'Settings' },
  { type: 'separator' },
  {
    type: 'group',
    label: 'Workspace',
    items: [
      { type: 'item', value: 'invite', label: 'Invite user' },
      { type: 'item', value: 'team', label: 'Team' },
      { type: 'item', value: 'leave', label: 'Leave workspace', disabled: true },
    ],
  },
  { type: 'separator' },
  { type: 'item', value: 'logout', label: 'Log out' },
];

const meta: Meta<typeof DropdownMenu> = {
  title: 'Organisms/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
  },
  args: {
    size: 'md',
    align: 'center',
    side: 'bottom',
    trigger: <Button>Open menu</Button>,
    items: baseItems,
  },
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {};

export const OpenByDefault: Story = {
  args: { defaultOpen: true },
};

export const WithLeadingIcons: Story = {
  args: {
    items: [
      { type: 'label', label: 'Quick actions' },
      {
        type: 'item',
        value: 'new',
        label: 'New file',
        leading: <span aria-hidden>+</span>,
      },
      {
        type: 'item',
        value: 'open',
        label: 'Open recent',
        leading: <span aria-hidden>O</span>,
        trailing: <span aria-hidden>⌘O</span>,
      },
      { type: 'separator' },
      {
        type: 'item',
        value: 'archive',
        label: 'Archive',
        leading: <span aria-hidden>A</span>,
        trailing: <span aria-hidden>⌘.</span>,
      },
    ],
  },
};

export const SmallSize: Story = {
  args: {
    size: 'sm',
    items: baseItems,
  },
};

export const LargeSize: Story = {
  args: {
    size: 'lg',
    items: baseItems,
  },
};

export const AnchoredRight: Story = {
  args: {
    side: 'right',
    align: 'start',
    trigger: <Button variant="outline">Anchored right</Button>,
  },
};

export const AllSides: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <DropdownMenu
          key={side}
          {...args}
          side={side}
          trigger={<Button variant="outline">{`Side ${side}`}</Button>}
        />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <DropdownMenu
          key={size}
          {...args}
          size={size}
          trigger={<Button>{`Size ${size}`}</Button>}
        />
      ))}
    </div>
  ),
};
