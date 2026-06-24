import type { Meta, StoryObj } from '@storybook/react';

import { Slash } from 'lucide-react';

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

const trailItems: BreadcrumbItem[] = [
  { type: 'crumb', label: 'Home', href: '/' },
  { type: 'separator' },
  { type: 'crumb', label: 'Library', href: '/library' },
  { type: 'separator' },
  { type: 'crumb', label: 'Settings' },
];

const meta: Meta<typeof Breadcrumb> = {
  title: 'Organisms/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    size: 'md',
    items: trailItems,
  },
};
export default meta;

type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {};

export const SingleCrumb: Story = {
  args: {
    items: [{ type: 'crumb', label: 'Dashboard' }],
  },
};

export const NonLinkable: Story = {
  args: {
    items: [
      { type: 'crumb', label: 'Home' },
      { type: 'separator' },
      { type: 'crumb', label: 'Account' },
      { type: 'separator' },
      { type: 'crumb', label: 'Profile' },
    ],
  },
};

export const ForcedCurrent: Story = {
  args: {
    items: [
      { type: 'crumb', label: 'Home', href: '/' },
      { type: 'separator' },
      { type: 'crumb', label: 'Library', href: '/library', current: true },
      { type: 'separator' },
      { type: 'crumb', label: 'Filter results', href: '/library/filter' },
    ],
  },
};

export const CustomSeparator: Story = {
  args: {
    items: [
      { type: 'crumb', label: 'Home', href: '/' },
      { type: 'separator', icon: <Slash aria-hidden /> },
      { type: 'crumb', label: 'Library', href: '/library' },
      { type: 'separator', icon: <Slash aria-hidden /> },
      { type: 'crumb', label: 'Settings' },
    ],
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Breadcrumb key={size} size={size} items={trailItems} />
      ))}
    </div>
  ),
};
