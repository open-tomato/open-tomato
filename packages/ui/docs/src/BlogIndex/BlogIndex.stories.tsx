import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlogIndex } from './BlogIndex';

/**
 * BlogIndex: the blog landing — editorial
 * header, one featured post over a diagonal tone wash, then a two-column grid
 * of the remaining posts. Each post pins to one of five accent tones.
 */
const meta = {
  title: 'Portal/BlogIndex',
  component: BlogIndex,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg pb-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlogIndex>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full default blog index. */
export const Default: Story = {};

/** A single featured post with no grid below. */
export const SinglePost: Story = {
  args: {
    posts: [
      {
        id: 'hello',
        title: 'Hello, world. We\'re Open Tomato.',
        excerpt:
          'We\'ve been quietly building for about nine months. Today we\'re going public.',
        author: 'team',
        date: 'Mar 15, 2026',
        readtime: '5 min',
        category: 'milestone',
        tone: 'accent',
      },
    ],
  },
};
