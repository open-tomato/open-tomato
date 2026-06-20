import type { Meta, StoryObj } from '@storybook/react';

import { Tabs, type TabsItemEntry } from './Tabs';

const sampleItems: TabsItemEntry[] = [
  {
    value: 'overview',
    trigger: 'Overview',
    content: (
      <p className="text-muted-foreground">
        Tabs composes the <code>Button</code> atom for triggers and wraps
        <code> @radix-ui/react-tabs</code> for the orientation-aware
        active-panel coordination.
      </p>
    ),
  },
  {
    value: 'props',
    trigger: 'Props',
    content: (
      <ul className="list-disc pl-6 text-muted-foreground">
        <li>
          <code>orientation</code> reflects on the root via Radix and flips the
          trigger-rail direction.
        </li>
        <li>
          <code>size</code> propagates to the composed Button atom via a
          lookup table.
        </li>
        <li>
          <code>density</code> tunes the trigger-rail padding.
        </li>
      </ul>
    ),
  },
  {
    value: 'history',
    trigger: 'History',
    content: (
      <p className="text-muted-foreground">
        Disabled tabs keep their trigger interactive-blocked but still render
        the descriptor row.
      </p>
    ),
    disabled: true,
  },
];

const meta: Meta<typeof Tabs> = {
  title: 'Templates/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    density: {
      control: 'inline-radio',
      options: ['compact', 'comfortable'],
    },
  },
  args: {
    size: 'md',
    orientation: 'horizontal',
    density: 'comfortable',
    defaultValue: 'overview',
    items: sampleItems,
    'aria-label': 'Section tabs',
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Compact: Story = {
  args: { density: 'compact' },
};

export const Controlled: Story = {
  render: function ControlledStory(args) {
    return <Tabs {...args} value="props" />;
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Tabs
          key={size}
          size={size}
          defaultValue="overview"
          aria-label={`Tabs (${size})`}
          items={[
            {
              value: 'overview',
              trigger: `Overview (${size})`,
              content: (
                <p>
                  Size <code>{size}</code> drives the composed Button atom&apos;s
                  size axis via the lookup table.
                </p>
              ),
            },
            {
              value: 'details',
              trigger: `Details (${size})`,
              content: <p>Per-size lookup table propagation in action.</p>,
            },
          ]}
        />
      ))}
    </div>
  ),
};
