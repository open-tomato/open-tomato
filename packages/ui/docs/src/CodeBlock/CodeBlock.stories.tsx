import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeBlock } from './CodeBlock';

/**
 * CodeBlock: a charcoal `<pre>` for code in docs/blog prose, kept dark in
 * both themes. Overrides the theme's unlayered `pre` rule with `!` (same as
 * CodeQuickstart's terminal).
 */
const meta = {
  title: 'Portal/CodeBlock',
  component: CodeBlock,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[640px] bg-bg p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single command. */
export const Single: Story = {
  args: { children: '$ tomato init' },
};

/** Multi-line transcript — whitespace preserved. */
export const Multiline: Story = {
  args: {
    children: `# the compost prompt that worked best
You are about to compact your own working memory.
Write ONE paragraph (no more) summarizing what you know,
what's decided, and what's left. Then we'll drop the older messages.`,
  },
};
