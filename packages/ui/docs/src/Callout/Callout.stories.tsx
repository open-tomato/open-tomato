import type { Meta, StoryObj } from '@storybook/react-vite';

import { Callout } from './Callout';

/**
 * Callout: a tone-tinted admonition with a colored left rule, used inside
 * docs/blog prose. Three tones — `leaf`, `warning`, `danger` (the `tone` axis
 * matches the catalog's tonal-component convention).
 */
const meta = {
  title: 'Portal/Callout',
  component: Callout,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    title: 'Heads up',
    children:
      'This page assumes you have already installed the CLI. If not, hop back to Install first.',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[640px] bg-bg p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default garden-green tone. */
export const Leaf: Story = { args: { tone: 'leaf' } };

/** Gold-sun warning tone — token budgets, caveats. */
export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Token budgets',
    children:
      'The --budget flag is a hard cap. Hit it and the agent stops cleanly. We default conservatively on purpose.',
  },
};

/** Danger tone — destructive or irreversible notes. */
export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'This cannot be undone',
    children: 'Deleting a workspace drops every session and transcript in it.',
  },
};

/** Title is optional — a bare-body callout. */
export const NoTitle: Story = {
  args: {
    tone: 'leaf',
    title: undefined,
    children: 'A quick aside with no heading, just a tinted note.',
  },
};
