import type { Meta, StoryObj } from '@storybook/react';

import { Command, type CommandItem } from './Command';

const baseItems: CommandItem[] = [
  { type: 'empty', label: 'No results found.' },
  {
    type: 'group',
    heading: 'Suggestions',
    items: [
      {
        type: 'item',
        value: 'profile',
        label: 'Profile',
        shortcut: '⌘P',
      },
      {
        type: 'item',
        value: 'settings',
        label: 'Settings',
        shortcut: '⌘,',
        keywords: ['preferences', 'account'],
      },
      {
        type: 'item',
        value: 'notifications',
        label: 'Notifications',
        shortcut: '⌘N',
      },
      {
        type: 'item',
        value: 'appearance',
        label: 'Appearance',
        keywords: ['theme', 'dark', 'light'],
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'group',
    heading: 'Workspace',
    items: [
      { type: 'item', value: 'invite', label: 'Invite user' },
      { type: 'item', value: 'team', label: 'Team management' },
      { type: 'item', value: 'billing', label: 'Billing' },
      { type: 'item', value: 'integrations', label: 'Integrations' },
    ],
  },
  { type: 'separator' },
  {
    type: 'group',
    heading: 'Help',
    items: [
      { type: 'item', value: 'docs', label: 'Documentation' },
      { type: 'item', value: 'shortcuts', label: 'Keyboard shortcuts', shortcut: '⌘/' },
      { type: 'item', value: 'feedback', label: 'Send feedback' },
      {
        type: 'item',
        value: 'logout',
        label: 'Sign out',
        keywords: ['logout', 'exit'],
        shortcut: '⇧⌘Q',
      },
    ],
  },
];

const meta: Meta<typeof Command> = {
  title: 'Organisms/Command',
  component: Command,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    placeholder: { control: 'text' },
    showSearch: { control: 'boolean' },
    searchDisabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    placeholder: 'Type a command or search…',
    showSearch: true,
    items: baseItems,
  },
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Command>;

export const Default: Story = {};

export const SmallSize: Story = {
  args: { size: 'sm' },
};

export const LargeSize: Story = {
  args: { size: 'lg' },
};

export const NoSearchBar: Story = {
  args: { showSearch: false },
};

export const PrefilledSearch: Story = {
  args: { defaultSearch: 'pro' },
};

export const FocusedItem: Story = {
  args: { defaultValue: 'settings' },
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Command key={size} {...args} size={size} />
      ))}
    </div>
  ),
};
