import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { Pagination, type PaginationProps } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Organisms/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    page: { control: { type: 'number', min: 1 } },
    pageCount: { control: { type: 'number', min: 0 } },
    siblingCount: { control: { type: 'number', min: 0 } },
    showFirstLast: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  args: {
    page: 5,
    pageCount: 20,
    siblingCount: 1,
    showFirstLast: false,
    size: 'md',
    align: 'center',
  },
};
export default meta;

type Story = StoryObj<typeof Pagination>;

const Controlled = (args: PaginationProps) => {
  const [page, setPage] = React.useState(args.page);
  // The story remounts the wrapper via a key derived from the Storybook
  // args.page value, so updating an arg from the controls panel resets the
  // local state to the new initial. Avoids the setState-in-effect smell.
  return <Pagination {...args} page={page} onPageChange={setPage} />;
};

const controlledKey = (args: PaginationProps): string => `${args.page}-${args.pageCount}-${args.siblingCount ?? 1}-${args.showFirstLast
  ? 'fl'
  : 'nofl'}-${args.size ?? 'md'}-${args.align ?? 'center'}`;

export const Default: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
};

export const NearStart: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { page: 1 },
};

export const NearEnd: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { page: 20 },
};

export const WithFirstLast: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { showFirstLast: true },
};

export const WideSiblings: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { siblingCount: 3 },
};

export const FewPages: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { page: 1, pageCount: 4 },
};

export const SinglePage: Story = {
  render: (args) => <Controlled key={controlledKey(args)} {...args} />,
  args: { page: 1, pageCount: 1 },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-3">
          {(['start', 'center', 'end'] as const).map((align) => (
            <Controlled
              key={`${size}-${align}`}
              page={3}
              pageCount={10}
              size={size}
              align={align}
              showFirstLast
              onPageChange={() => {}}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
