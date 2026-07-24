import type { Meta, StoryObj } from '@storybook/react-vite';

import { DocsLayout } from './DocsLayout';

/**
 * DocsLayout: the three-column docs shell — sidebar, article, and on-page
 * TOC. Composes DocsSidebar, the catalog Breadcrumb, Prose/Callout/CodeBlock,
 * and DocsTOC. Defaults render the quickstart page.
 */
const meta = {
  title: 'Portal/DocsLayout',
  component: DocsLayout,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg pb-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default quickstart page. */
export const Default: Story = {};

/** A different active sidebar page. */
export const ConceptsActive: Story = {
  args: {
    active: 'concepts',
    breadcrumb: [
      { key: 'docs', label: 'Docs' },
      { key: 'getting-started', label: 'Getting started' },
      { key: 'concepts', label: 'Core concepts' },
    ],
    title: 'Core concepts',
    lead: 'Three ideas carry the whole system: sessions, budgets, and compost.',
  },
};
