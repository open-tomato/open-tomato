import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Collapsible } from './Collapsible';

const meta: Meta<typeof Collapsible> = {
  title: 'Molecules/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    chevron: {
      control: 'inline-radio',
      options: ['leading', 'trailing', 'none'],
    },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    size: 'md',
    chevron: 'trailing',
    defaultOpen: false,
  },
};
export default meta;

type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {
  render: (args) => (
    <Collapsible {...args} trigger={<Button variant="outline">Toggle details</Button>}>
      <p className="rounded-md border border-border bg-muted/40 p-3">
        Hidden content revealed when the trigger is clicked. Renders inside a
        Radix Collapsible content region.
      </p>
    </Collapsible>
  ),
};

export const LeadingChevron: Story = {
  args: { chevron: 'leading' },
  render: (args) => (
    <Collapsible {...args} trigger={<Button variant="ghost">Show advanced options</Button>}>
      <ul className="list-disc pl-6 text-sm text-muted-foreground">
        <li>Option one</li>
        <li>Option two</li>
        <li>Option three</li>
      </ul>
    </Collapsible>
  ),
};

export const NoChevron: Story = {
  args: { chevron: 'none' },
  render: (args) => (
    <Collapsible {...args} trigger={<Button variant="outline">Toggle (no chevron)</Button>}>
      <p className="text-sm text-muted-foreground">
        The molecule does not inject a chevron when <code>chevron=&quot;none&quot;</code>.
      </p>
    </Collapsible>
  ),
};

export const DefaultOpen: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <Collapsible {...args} trigger={<Button variant="outline">Collapse</Button>}>
      <p className="rounded-md border border-border bg-muted/40 p-3">
        Renders open on mount via <code>defaultOpen</code>.
      </p>
    </Collapsible>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Collapsible
          key={size}
          size={size}
          trigger={<Button size={size} variant="outline">{`Toggle (${size})`}</Button>}
        >
          <p className="rounded-md border border-border bg-muted/40 p-3">
            Size <code>{size}</code> drives the gap between trigger and content
            plus the auto-injected chevron icon size.
          </p>
        </Collapsible>
      ))}
    </div>
  ),
};
