import type { Meta, StoryObj } from '@storybook/react-vite';

import { Hero } from './Hero';

/**
 * Portal Hero: release badge, oversized display headline with a
 * primary-tinted highlight, lead, CTA pair, and social-proof stats over a
 * faint circuit ornament; mascot in a gold glow.
 *
 * The library ships the mascot mark as the default `media` and exposes the
 * slot so consumers supply their own hero art.
 */
const meta = {
  title: 'Portal/Hero',
  component: Hero,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The canonical marketing hero. */
export const Default: Story = {};
