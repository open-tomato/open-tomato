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
    frame: { control: 'select', options: ['none', 'bordered', 'card'] },
    viewportPadding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
  args: {
    orientation: 'vertical',
    frame: 'bordered',
    viewportPadding: 'md',
    'aria-label': 'Scrollable region',
  },
};
export default meta;

type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: (args) => (
    <div className="h-72 w-48">
      <ScrollArea {...args}>
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {verticalTags.map((tag) => (
          <div key={tag} className="border-b border-border py-2 text-sm last:border-b-0">
            {tag}
          </div>
        ))}
      </ScrollArea>
    </div>
  ),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <div className="w-96">
      <ScrollArea {...args}>
        <div className="flex w-max gap-3 whitespace-nowrap">
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
    </div>
  ),
};

export const Both: Story = {
  args: { orientation: 'both' },
  render: (args) => (
    <div className="h-72 w-72">
      <ScrollArea {...args}>
        <div className="w-[640px]">
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
    </div>
  ),
};

export const FrameVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(['none', 'bordered', 'card'] as const).map((frame) => (
        <div key={frame} className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            frame=
            {frame}
          </span>
          <div className="h-48 w-40">
            <ScrollArea aria-label={`${frame} frame`} frame={frame} viewportPadding="md">
              {verticalTags.slice(0, 30).map((tag) => (
                <div key={tag} className="py-1 text-sm">{tag}</div>
              ))}
            </ScrollArea>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const ViewportPaddingVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(['none', 'sm', 'md', 'lg'] as const).map((padding) => (
        <div key={padding} className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            viewportPadding=
            {padding}
          </span>
          <div className="h-48 w-40">
            <ScrollArea
              aria-label={`viewportPadding ${padding}`}
              frame="bordered"
              viewportPadding={padding}
            >
              {verticalTags.slice(0, 30).map((tag) => (
                <div key={tag} className="py-1 text-sm">{tag}</div>
              ))}
            </ScrollArea>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          vertical
        </span>
        <div className="h-48 w-40">
          <ScrollArea aria-label="vertical example" frame="bordered" viewportPadding="sm">
            {verticalTags.slice(0, 30).map((tag) => (
              <div key={tag} className="py-1 text-sm">{tag}</div>
            ))}
          </ScrollArea>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          horizontal
        </span>
        <div className="w-80">
          <ScrollArea
            aria-label="horizontal example"
            orientation="horizontal"
            frame="bordered"
            viewportPadding="sm"
          >
            <div className="flex w-max gap-2 whitespace-nowrap">
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
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          both
        </span>
        <div className="h-48 w-60">
          <ScrollArea
            aria-label="both example"
            orientation="both"
            frame="bordered"
            viewportPadding="sm"
          >
            <div className="w-[480px]">
              {Array.from({ length: 20 }).map((_, row) => (
                <div key={row} className="flex gap-2 py-1 text-sm">
                  {Array.from({ length: 10 }).map((__, col) => (
                    <span key={col} className="shrink-0 rounded bg-muted px-2 py-1">
                      {row + 1}
                      ,
                      {col + 1}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  ),
};
