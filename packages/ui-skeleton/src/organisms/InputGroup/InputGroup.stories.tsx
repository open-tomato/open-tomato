import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';
import { Kbd } from '@/atoms/Kbd';

import { InputGroup } from './InputGroup';

const meta: Meta<typeof InputGroup> = {
  title: 'Organisms/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    invalid: false,
    placeholder: 'Search…',
    'aria-label': 'Search',
  },
};
export default meta;

type Story = StoryObj<typeof InputGroup>;

export const Default: Story = {};

export const WithLeadingKbd: Story = {
  args: {
    leading: <Kbd size="sm">⌘K</Kbd>,
  },
};

export const WithTrailingButton: Story = {
  args: {
    'aria-label': 'Coupon code',
    placeholder: 'Coupon code',
    trailing: (
      <Button size="sm" variant="ghost">
        Apply
      </Button>
    ),
  },
};

export const WithBothSlots: Story = {
  args: {
    'aria-label': 'Amount',
    placeholder: '0.00',
    leading: <span aria-hidden>$</span>,
    trailing: <span aria-hidden>USD</span>,
  },
};

export const Invalid: Story = {
  args: {
    'aria-label': 'Email',
    invalid: true,
    defaultValue: 'invalid@',
    placeholder: undefined,
    leading: <span aria-hidden>@</span>,
  },
};

export const Disabled: Story = {
  args: {
    'aria-label': 'Locked',
    disabled: true,
    defaultValue: 'read-only-value',
    leading: <span aria-hidden>·</span>,
  },
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          <InputGroup
            {...args}
            size={size}
            invalid={false}
            aria-label={`Default ${size}`}
            placeholder={`${size} / default`}
            leading={<Kbd size={size}>⌘K</Kbd>}
          />
          <InputGroup
            {...args}
            size={size}
            invalid
            aria-label={`Invalid ${size}`}
            placeholder={undefined}
            defaultValue="bad@value"
            leading={<span aria-hidden>@</span>}
            trailing={(
              <Button size="sm" variant="ghost">
                Fix
              </Button>
            )}
          />
        </div>
      ))}
    </div>
  ),
};
