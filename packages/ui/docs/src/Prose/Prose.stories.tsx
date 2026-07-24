import type { Meta, StoryObj } from '@storybook/react-vite';

import { Callout } from '../Callout';
import { CodeBlock } from '../CodeBlock';

import { Prose } from './Prose';

/**
 * Prose: the scoped rich-text container for docs/blog bodies. The
 * `portal-prose` element rules
 * style headings, paragraphs, inline code, emphasis, lists, blockquotes, and
 * links without any per-element utility classes — so markdown/MDX content
 * renders styled out of the box. Callout and CodeBlock compose inside it.
 */
const meta = {
  title: 'Portal/Prose',
  component: Prose,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[740px] bg-bg p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Prose>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full element coverage: heading, paragraphs, inline code, emphasis. */
export const Default: Story = {
  render: () => (
    <Prose>
      <p>
        One of the things that consistently breaks long agent sessions is
        context rot. The model accumulates a wall of intermediate thinking and
        an ever-growing pile of <em>what was I doing again?</em>
      </p>
      <h2>What we tried</h2>
      <p>
        The first version was dead simple. Every 20 tool calls, we&apos;d ask
        the agent to summarize what it had learned, then drop everything except
        the summary. Set the flag with <code>--compost auto</code>.
      </p>
      <Callout tone="leaf" title="A quick definition">
        By &quot;compost&quot; we mean: every N turns, the agent summarizes
        everything so far into a shorter representation, then evicts the raw
        messages.
      </Callout>
      <CodeBlock>{'$ tomato run "add a /healthz endpoint" --budget 20k'}</CodeBlock>
    </Prose>
  ),
};

/** Lists, blockquote, and links — the rest of the markdown surface. */
export const ListsAndQuotes: Story = {
  render: () => (
    <Prose>
      <h2>Core concepts</h2>
      <p>Three ideas carry the whole system:</p>
      <ul>
        <li>
          <strong>Sessions</strong> are the unit of work — one goal, one budget.
        </li>
        <li>
          <strong>Budgets</strong> are a hard token cap; hit it and the agent
          stops cleanly.
        </li>
        <li>
          <strong>Compost</strong> keeps long runs from drifting off the rails.
        </li>
      </ul>
      <blockquote>
        The garden is open. Come tell us what you&apos;d try.
      </blockquote>
      <p>
        Still stuck? The <a href="#docs">docs</a> cover every command in detail.
      </p>
    </Prose>
  ),
};
