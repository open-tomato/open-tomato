import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { Accordion, type AccordionItemEntry } from './Accordion';

const sampleItems: AccordionItemEntry[] = [
  {
    type: 'item',
    value: 'overview',
    trigger: <Button variant="ghost">Overview</Button>,
    content: (
      <p className="text-muted-foreground">
        Accordion composes the Collapsible molecule&apos;s content-styling
        variants and wraps <code>@radix-ui/react-accordion</code> for multi-item
        coordination.
      </p>
    ),
  },
  {
    type: 'item',
    value: 'props',
    trigger: <Button variant="ghost">Props</Button>,
    content: (
      <ul className="list-disc pl-6 text-muted-foreground">
        <li>
          <code>type</code> discriminates single-open vs multi-open APIs.
        </li>
        <li>
          <code>size</code> drives trigger padding, content padding, and the
          auto-injected chevron icon size.
        </li>
        <li>
          <code>orientation</code> reflects on the root via Radix and flips the
          item-divider direction.
        </li>
      </ul>
    ),
  },
  {
    type: 'item',
    value: 'history',
    trigger: <Button variant="ghost">History</Button>,
    content: (
      <p className="text-muted-foreground">
        Disabled items keep their trigger interactive-blocked but still render
        the descriptor row.
      </p>
    ),
    disabled: true,
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'Organisms/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'inline-radio', options: ['single', 'multiple'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
    chevron: {
      control: 'inline-radio',
      options: ['leading', 'trailing', 'none'],
    },
  },
  args: {
    type: 'single',
    size: 'md',
    orientation: 'vertical',
    chevron: 'trailing',
    items: sampleItems,
  },
};
export default meta;

type Story = StoryObj<typeof Accordion>;

export const Default: Story = {};

export const SingleCollapsible: Story = {
  args: {
    type: 'single',
    defaultValue: 'overview',
    collapsible: true,
  },
};

export const Multiple: Story = {
  args: {
    type: 'multiple',
    defaultValue: ['overview', 'props'],
  },
};

export const LeadingChevron: Story = {
  args: { chevron: 'leading' },
};

export const NoChevron: Story = {
  args: { chevron: 'none' },
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Accordion
          key={size}
          type="single"
          size={size}
          defaultValue="overview"
          items={[
            {
              type: 'item',
              value: 'overview',
              trigger: <Button size={size} variant="ghost">{`Overview (${size})`}</Button>,
              content: (
                <p>
                  Size <code>{size}</code> drives trigger padding, content
                  padding, and the auto-injected chevron icon size.
                </p>
              ),
            },
            {
              type: 'item',
              value: 'details',
              trigger: <Button size={size} variant="ghost">{`Details (${size})`}</Button>,
              content: <p>Per-size lookup table propagation in action.</p>,
            },
          ]}
        />
      ))}
    </div>
  ),
};
