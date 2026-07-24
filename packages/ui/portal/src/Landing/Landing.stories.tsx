import type { Meta, StoryObj } from '@storybook/react-vite';

import { Footer } from '../Footer';
import { Header } from '../Header';

import { Landing } from './Landing';

/**
 * Landing: the marketing home body — Hero, CodeQuickstart, FeatureGrid,
 * CommunityStrip. `WithChrome` frames it in the portal Header + Footer to
 * show the full marketing home.
 */
const meta = {
  title: 'Portal/Landing',
  component: Landing,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page body on its own (what the app's `<main>` receives). */
export const Default: Story = {};

/** The full marketing home — Header + Landing + Footer. */
export const WithChrome: Story = {
  render: () => (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header active="home" theme="light" />
      <main className="flex-1">
        <Landing />
      </main>
      <Footer />
    </div>
  ),
};
