import type { Meta, StoryObj } from '@storybook/react-vite';

import { DocsSidebar } from './DocsSidebar';

/**
 * DocsSidebar: the sticky, section-grouped docs nav. The active link gets a
 * sunk fill and a primary left rail.
 */
const meta = {
  title: 'Portal/DocsSidebar',
  component: DocsSidebar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { active: 'quickstart' },
  decorators: [
    (Story) => (
      <div className="w-[240px] bg-bg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocsSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Quickstart selected under "Getting started". */
export const Default: Story = {};

/** A deeper active page — the highlight tracks any id. */
export const CliSection: Story = { args: { active: 'tomato-run' } };
