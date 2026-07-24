import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommunityStrip } from './CommunityStrip';

/**
 * CommunityStrip: the accent-filled "built with friends" band — heading +
 * lead, three contributor quotes, and an inverse GitHub/Discord CTA pair,
 * over a faint circuit pattern.
 */
const meta = {
  title: 'Portal/CommunityStrip',
  component: CommunityStrip,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
