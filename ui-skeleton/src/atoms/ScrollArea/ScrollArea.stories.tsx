import type { Meta, StoryObj } from '@storybook/react';

import { ScrollArea } from './ScrollArea';

const verticalTags = Array.from({ length: 50 }).map((_, i) => `v1.2.0-beta.${50 - i}`);
const horizontalChips = Array.from({ length: 24 }).map((_, i) => `Chip ${i + 1}`);

const meta: Meta<typeof ScrollArea> = {
  title: 'Atoms/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal', 'both'] },
  },
  args: {
    orientation: 'vertical',
    'aria-label': 'Scrollable region',
  },
};
export default meta;

type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  args: { className: 'h-72 w-48 rounded-md border' },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {verticalTags.map((tag) => (
          <div key={tag} className="border-b border-border py-2 text-sm last:border-b-0">
            {tag}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    className: 'w-96 whitespace-nowrap rounded-md border',
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="flex w-max gap-3 p-4">
        {horizontalChips.map((chip) => (
          <span
            key={chip}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs"
          >
            {chip}
          </span>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Both: Story = {
  args: {
    orientation: 'both',
    className: 'h-72 w-72 rounded-md border',
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="w-[640px] p-4">
        {Array.from({ length: 40 }).map((_, row) => (
          <div key={row} className="flex gap-2 py-1 text-sm">
            {Array.from({ length: 16 }).map((__, col) => (
              <span key={col} className="shrink-0 rounded bg-muted px-2 py-1">
                r{row + 1}c{col + 1}
              </span>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          vertical
        </span>
        <ScrollArea aria-label="vertical example" className="h-48 w-40 rounded-md border">
          <div className="p-3 text-sm">
            {verticalTags.slice(0, 30).map((tag) => (
              <div key={tag} className="py-1">{tag}</div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          horizontal
        </span>
        <ScrollArea
          orientation="horizontal"
          aria-label="horizontal example"
          className="w-80 whitespace-nowrap rounded-md border"
        >
          <div className="flex w-max gap-2 p-3">
            {horizontalChips.map((chip) => (
              <span key={chip} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs">
                {chip}
              </span>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          both
        </span>
        <ScrollArea
          orientation="both"
          aria-label="both example"
          className="h-48 w-60 rounded-md border"
        >
          <div className="w-[480px] p-3">
            {Array.from({ length: 20 }).map((_, row) => (
              <div key={row} className="flex gap-2 py-1 text-sm">
                {Array.from({ length: 10 }).map((__, col) => (
                  <span key={col} className="shrink-0 rounded bg-muted px-2 py-1">
                    {row + 1},{col + 1}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  ),
};
