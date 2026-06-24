import type { Meta, StoryObj } from '@storybook/react';

import { Table } from './Table';

const meta: Meta<typeof Table> = {
  title: 'Molecules/Table',
  component: Table,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'striped', 'bordered'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    density: {
      control: 'inline-radio',
      options: ['comfortable', 'compact'],
    },
    caption: { control: 'text' },
  },
  args: {
    variant: 'default',
    size: 'md',
    density: 'comfortable',
    caption: 'Recent orders, week of Nov 4.',
    headers: ['Order', 'Customer', 'Amount'],
    rows: [
      ['#1023', 'Alex Rivera', '$48.20'],
      ['#1024', 'Sam Park', '$112.00'],
      ['#1025', 'Jordan Lee', '$74.10'],
      ['#1026', 'Riley Chen', '$203.55'],
    ],
    footer: ['Total', '', '$437.85'],
  },
};
export default meta;

type Story = StoryObj<typeof Table>;

export const Default: Story = {};

export const Striped: Story = {
  args: { variant: 'striped' },
};

export const Bordered: Story = {
  args: { variant: 'bordered' },
};

export const Compact: Story = {
  args: { density: 'compact', size: 'sm' },
};

export const WithoutCaption: Story = {
  args: { caption: undefined },
};

export const WithoutFooter: Story = {
  args: { footer: undefined },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      {(['default', 'striped', 'bordered'] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-3">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Table
              key={`${variant}-${size}`}
              variant={variant}
              size={size}
              caption={`${variant} / ${size}`}
              headers={['Column A', 'Column B', 'Column C']}
              rows={[
                ['row-1-a', 'row-1-b', 'row-1-c'],
                ['row-2-a', 'row-2-b', 'row-2-c'],
                ['row-3-a', 'row-3-b', 'row-3-c'],
              ]}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
