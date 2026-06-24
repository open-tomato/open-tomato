import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { Item } from './Item';

const meta: Meta<typeof Item> = {
  title: 'Molecules/Item',
  component: Item,
  tags: ['autodocs'],
  argTypes: {
    as: {
      control: 'inline-radio',
      options: ['div', 'li', 'button', 'a'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    interactive: { control: 'boolean' },
    active: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    as: 'div',
    size: 'md',
    interactive: false,
    active: false,
    title: 'Settings',
    description: 'Configure your account preferences.',
  },
};
export default meta;

type Story = StoryObj<typeof Item>;

const LeadingIcon = (): React.ReactElement => (
  <span
    aria-hidden
    className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-foreground"
  >
    ⚙
  </span>
);

const TrailingChevron = (): React.ReactElement => (
  <span aria-hidden className="text-muted-foreground">›</span>
);

export const Default: Story = {
  render: (args) => <Item {...args} />,
};

export const WithSlots: Story = {
  args: {
    leading: <LeadingIcon />,
    trailing: <TrailingChevron />,
  },
  render: (args) => <Item {...args} />,
};

export const AsButton: Story = {
  args: {
    as: 'button',
    interactive: true,
    title: 'Sign in',
    description: 'Authenticate with your credentials',
    leading: <LeadingIcon />,
    trailing: <TrailingChevron />,
  },
  render: (args) => <Item {...args} />,
};

export const AsAnchor: Story = {
  args: {
    as: 'a',
    interactive: true,
    title: 'View profile',
    description: 'Navigate to your profile page',
    leading: <LeadingIcon />,
    trailing: <TrailingChevron />,
  },
  render: (args) => <Item {...args} href="#profile" />,
};

const NavGlyph = (): React.ReactElement => (
  <span
    aria-hidden
    className="inline-flex size-4 items-center justify-center"
  >
    ◆
  </span>
);

export const NavRow: Story = {
  name: 'As nav row (active)',
  args: {
    as: 'button',
    interactive: true,
    active: true,
    title: 'Dashboard',
    description: undefined,
    leading: <NavGlyph />,
  },
  render: (args) => <Item {...args} />,
};

export const NavList: Story = {
  name: 'As nav list (one active)',
  render: () => {
    const items = [
      { label: 'Dashboard', active: true },
      { label: 'Projects', active: false },
      { label: 'Reports', active: false },
      { label: 'Settings', active: false },
    ];
    return (
      <nav aria-label="Primary" className="flex w-56 flex-col gap-1">
        {items.map((item) => (
          <Item
            key={item.label}
            as="button"
            interactive
            active={item.active}
            leading={<NavGlyph />}
            title={item.label}
          />
        ))}
      </nav>
    );
  },
};

export const InList: Story = {
  render: () => (
    <ul className="m-0 list-none p-0">
      <Item as="li" interactive title="One" description="First item" leading={<LeadingIcon />} trailing={<TrailingChevron />} />
      <Item as="li" interactive title="Two" description="Second item" leading={<LeadingIcon />} trailing={<TrailingChevron />} />
      <Item as="li" interactive title="Three" description="Third item" leading={<LeadingIcon />} trailing={<TrailingChevron />} />
    </ul>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0">
          <Item
            size={size}
            title={`Non-interactive / ${size}`}
            description="Display-only row"
            leading={<LeadingIcon />}
            trailing={<TrailingChevron />}
          />
          <Item
            size={size}
            interactive
            title={`Interactive / ${size}`}
            description="Hover and focus styling applied"
            leading={<LeadingIcon />}
            trailing={<TrailingChevron />}
          />
          <Item
            as="button"
            size={size}
            interactive
            active
            title={`Active nav / ${size}`}
            leading={<NavGlyph />}
          />
        </div>
      ))}
    </div>
  ),
};
