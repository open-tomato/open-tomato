import type { BlogPostMeta } from '../BlogIndex';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlogPost } from './BlogPost';

const COMPOST_POST: BlogPostMeta = {
  id: 'compost',
  title: 'We\'re trying something called context compost',
  excerpt:
    'Long agent sessions go off the rails. We\'re experimenting with a way to gracefully forget — keeping what matters, dropping what doesn\'t.',
  author: 'ren',
  date: 'May 12, 2026',
  readtime: '8 min',
  category: 'experiment',
  tone: 'green',
};

/**
 * BlogPost: the article reading layout — back link, meta row, display
 * headline, tone-filled author avatar, prose body (Prose + Callout +
 * CodeBlock), and a footer nav. The default body is the compost article.
 */
const meta = {
  title: 'Portal/BlogPost',
  component: BlogPost,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { post: COMPOST_POST },
  decorators: [
    (Story) => (
      <div className="bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlogPost>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default compost article, green tone. */
export const Default: Story = {};

/** A different tone drives the category color + author avatar. */
export const GoldTone: Story = {
  args: {
    post: {
      ...COMPOST_POST,
      id: 'swarms',
      title: 'When does a swarm of small agents beat one big agent?',
      author: 'cordelia',
      category: 'research',
      tone: 'gold',
      readtime: '12 min',
    },
    tags: 'research · swarms · benchmarks',
  },
};
