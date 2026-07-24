import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeQuickstart } from './CodeQuickstart';

/**
 * CodeQuickstart: the install/seed/run band — copy on the left, a charcoal
 * terminal transcript on the right. Part of the Landing composition.
 */
const meta = {
  title: 'Portal/CodeQuickstart',
  component: CodeQuickstart,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeQuickstart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
