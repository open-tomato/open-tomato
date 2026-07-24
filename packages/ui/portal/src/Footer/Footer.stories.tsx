import type { Meta, StoryObj } from '@storybook/react-vite';

import { Footer } from './Footer';

/**
 * Portal Footer: brand column with blurb + social pills, four link columns,
 * and a mono legal bar. Columns, social marks, blurb, and legal/tagline are
 * all overridable.
 */
const meta = {
  title: 'Portal/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full marketing footer with default content. */
export const Default: Story = {};
