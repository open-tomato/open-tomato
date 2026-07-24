import type { Meta, StoryObj } from '@storybook/react-vite';

import { Header } from './Header';

/**
 * Portal Header: sticky frosted bar with the brand lockup, primary nav, a
 * ⌘K search trigger, GitHub, the theme toggle, and the primary CTA. Nav +
 * brand emit `onNavigate(id)`.
 *
 * Rendered over a tall page-background panel so the translucent blur reads.
 */
const meta = {
  title: 'Portal/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-[280px] bg-bg">
        <Story />
        <div className="px-7 py-10 text-sm text-fg3">page content scrolls beneath the frosted header</div>
      </div>
    ),
  ],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Marketing home — the Home link active. */
export const Default: Story = {
  args: { active: 'home', theme: 'light' },
};

/** Docs route active. */
export const DocsActive: Story = {
  args: { active: 'docs', theme: 'light' },
};

/** Dark theme — the toggle shows the sun. */
export const Dark: Story = {
  args: { active: 'home', theme: 'dark' },
};
