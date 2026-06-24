import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from '@/atoms/Badge';
import { Button } from '@/atoms/Button';
import { Typography } from '@/atoms/Typography';

import { Sidebar, type SidebarNavItem } from './Sidebar';

const navItems: SidebarNavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    leading: <span aria-hidden>🏠</span>,
    active: true,
  },
  {
    label: 'Reports',
    href: '/reports',
    leading: <span aria-hidden>📊</span>,
  },
  {
    label: 'Inbox',
    href: '/inbox',
    leading: <span aria-hidden>✉️</span>,
    trailing: <Badge>3</Badge>,
  },
  {
    label: 'Customers',
    href: '/customers',
    leading: <span aria-hidden>👥</span>,
  },
  {
    label: 'Settings',
    href: '/settings',
    leading: <span aria-hidden>⚙️</span>,
  },
];

const meta: Meta<typeof Sidebar> = {
  title: 'Templates/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['expanded', 'rail', 'hidden'],
    },
    side: {
      control: 'inline-radio',
      options: ['left', 'right'],
    },
    density: {
      control: 'inline-radio',
      options: ['comfortable', 'compact'],
    },
  },
  args: {
    mode: 'expanded',
    side: 'left',
    density: 'comfortable',
    nav: navItems,
    header: <Typography variant="h5">Acme</Typography>,
    footer: <Button variant="ghost">Sign out</Button>,
  },
  decorators: [
    (Story) => (
      <div className="flex h-[28rem] w-full overflow-hidden rounded-md border border-border bg-background">
        <Story />
        <main className="flex-1 p-6">
          <Typography variant="h4">Workspace</Typography>
          <Typography variant="body">
            The Sidebar template frames the left or right edge of the
            application surface. The `mode` axis switches between the
            full-width rail, the icon-only rail, and the mobile-hide
            slide-out — all sharing the same {'`<aside>`'} DOM.
          </Typography>
        </main>
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {};

export const Rail: Story = {
  args: { mode: 'rail' },
};

export const Hidden: Story = {
  args: { mode: 'hidden' },
};

export const RightSide: Story = {
  args: { side: 'right' },
  decorators: [
    (Story) => (
      <div className="flex h-[28rem] w-full overflow-hidden rounded-md border border-border bg-background">
        <main className="flex-1 p-6">
          <Typography variant="h4">Workspace</Typography>
          <Typography variant="body">
            Mirror layout: nav rail anchors to the right edge.
          </Typography>
        </main>
        <Story />
      </div>
    ),
  ],
};

export const RightHidden: Story = {
  args: { side: 'right', mode: 'hidden' },
  decorators: [
    (Story) => (
      <div className="flex h-[28rem] w-full overflow-hidden rounded-md border border-border bg-background">
        <main className="flex-1 p-6">
          <Typography variant="h4">Workspace</Typography>
          <Typography variant="body">
            Right-anchored rail slid off the right edge for the
            mobile-hide state.
          </Typography>
        </main>
        <Story />
      </div>
    ),
  ],
};

export const Compact: Story = {
  args: { density: 'compact' },
};

export const WithoutHeader: Story = {
  args: { header: undefined },
};

export const WithoutFooter: Story = {
  args: { footer: undefined },
};

export const MinimalRail: Story = {
  args: {
    header: undefined,
    footer: undefined,
    nav: navItems.slice(0, 3),
  },
};
