import type { Meta, StoryObj } from '@storybook/react-vite';

import { FeatureGrid } from './FeatureGrid';

/**
 * FeatureGrid: a section heading over a three-column grid of tinted-icon
 * feature cards, each in one of six marketing accents. Cards lift on hover
 * (transform + shadow only).
 */
const meta = {
  title: 'Portal/FeatureGrid',
  component: FeatureGrid,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeatureGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
