import { TomatoMark } from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type MouseEvent } from 'react';

import { cn } from '../lib';

import {
  featuredCard,
  featuredCategoryChip,
  featuredMedia,
  portalBlogIndex,
  postCard,
  postCardLink,
  postCategoryText,
  type PostTone,
} from './BlogIndex.variants';

export interface BlogPostMeta {
  id: string;
  title: string;
  excerpt: string;
  /** Handle without the leading `@`. */
  author: string;
  date: string;
  readtime: string;
  category: string;
  tone: PostTone;
}

/**
 * The default posts, each mapped to a `tone`. Not exported from the component
 * file (react-refresh only-export-components) — pass your own `posts`.
 */
const DEFAULT_POSTS: readonly BlogPostMeta[] = [
  {
    id: 'compost',
    title: 'We\'re trying something called context compost',
    excerpt:
      'Long agent sessions go off the rails. We\'re experimenting with a way to gracefully forget — keeping what matters, dropping what doesn\'t. Here\'s what we\'ve learned in the first three weeks.',
    author: 'ren',
    date: 'May 12, 2026',
    readtime: '8 min',
    category: 'experiment',
    tone: 'green',
  },
  {
    id: 'budgets',
    title: 'Token budgets are the most important feature we shipped this quarter',
    excerpt:
      'We added per-session budgets in 0.3 and it changed how people use the tool. Here\'s why this dumb little hard cap is the thing that makes the whole system feel safe.',
    author: 'sam',
    date: 'Apr 28, 2026',
    readtime: '6 min',
    category: 'shipping',
    tone: 'primary',
  },
  {
    id: 'swarms',
    title: 'When does a swarm of small agents beat one big agent?',
    excerpt:
      'We ran 47 of the same task with one big agent and with five smaller agents collaborating. The results were not what we expected.',
    author: 'cordelia',
    date: 'Apr 14, 2026',
    readtime: '12 min',
    category: 'research',
    tone: 'gold',
  },
  {
    id: 'roadmap',
    title: 'Roadmap update: what\'s growing in the spring patch',
    excerpt:
      'A short note on what we\'re working on through Q2: the new dashboard layout, agent swarms, an alpha for the VS Code extension, and finally — finally — Windows support.',
    author: 'team',
    date: 'Apr 1, 2026',
    readtime: '4 min',
    category: 'roadmap',
    tone: 'info',
  },
  {
    id: 'hello',
    title: 'Hello, world. We\'re Open Tomato.',
    excerpt:
      'We\'ve been quietly building for about nine months. Today we\'re going public. Here\'s who we are, what we\'re making, and why.',
    author: 'team',
    date: 'Mar 15, 2026',
    readtime: '5 min',
    category: 'milestone',
    tone: 'accent',
  },
];

/** Author · date [· readtime] byline shared by both card shapes. */
const Byline = ({
  post,
  showReadtime = false,
}: {
  post: BlogPostMeta;
  showReadtime?: boolean;
}) => (
  <div className="mt-auto flex items-center gap-2 text-xs text-fg3">
    <span className="font-semibold text-fg2">@{post.author}</span>
    <span>·</span>
    <span>{post.date}</span>
    {showReadtime && (
      <>
        <span>·</span>
        <span>{post.readtime}</span>
      </>
    )}
  </div>
);

const openHandler =
  (post: BlogPostMeta, onOpenPost?: (post: BlogPostMeta) => void) => (e: MouseEvent) => {
    e.preventDefault();
    onOpenPost?.(post);
  };

const FeaturedCard = ({
  post,
  onOpenPost,
}: {
  post: BlogPostMeta;
  onOpenPost?: (post: BlogPostMeta) => void;
}) => (
  <article className={featuredCard()}>
    <a
      href={`#${post.id}`}
      aria-label={post.title}
      onClick={openHandler(post, onOpenPost)}
      className={postCardLink()}
    />
    <div className={featuredMedia({ tone: post.tone })}>
      <TomatoMark size={140} />
      <span className={featuredCategoryChip()}>{post.category}</span>
    </div>
    <div className="flex flex-col justify-center gap-3.5 p-8">
      <h2 className="!m-0 !text-[30px] !font-bold !leading-[1.1] !tracking-[-0.02em]">
        {post.title}
      </h2>
      <p className="!m-0 !text-[15px] !leading-[1.6] !text-fg2">{post.excerpt}</p>
      <Byline post={post} showReadtime />
    </div>
  </article>
);

const PostCard = ({
  post,
  onOpenPost,
}: {
  post: BlogPostMeta;
  onOpenPost?: (post: BlogPostMeta) => void;
}) => (
  <article className={postCard()}>
    <a
      href={`#${post.id}`}
      aria-label={post.title}
      onClick={openHandler(post, onOpenPost)}
      className={postCardLink()}
    />
    <div className="flex items-center justify-between">
      <span className={cn(postCategoryText({ tone: post.tone }), 'text-[11px] tracking-[0.05em]')}>
        {post.category}
      </span>
      <span className="text-xs text-fg3">{post.readtime}</span>
    </div>
    <h3 className="!m-0 !text-[20px] !font-bold !leading-[1.2] !tracking-[-0.01em]">
      {post.title}
    </h3>
    <p className="!m-0 !text-sm !leading-[1.55] !text-fg2">{post.excerpt}</p>
    <Byline post={post} />
  </article>
);

export interface BlogIndexProps extends HTMLAttributes<HTMLDivElement> {
  /** Posts to list. First is featured. Defaults to the marketing set. */
  posts?: readonly BlogPostMeta[];
  /** Eyebrow above the title. */
  eyebrow?: string;
  /** Index page title. */
  title?: string;
  /** Supporting lead paragraph. */
  lead?: string;
  /** Called when a post card is opened. */
  onOpenPost?: (post: BlogPostMeta) => void;
}

/**
 * BlogIndex — the blog landing: an editorial header, one featured post, then
 * a two-column grid of the rest. Cards are accessible clickable regions (a
 * stretched overlay link keeps the headings real headings) that emit
 * `onOpenPost`. The featured mascot uses the shared TomatoMark.
 */
export const BlogIndex = forwardRef<HTMLDivElement, BlogIndexProps>(
  (
    {
      className,
      posts = DEFAULT_POSTS,
      eyebrow = 'blog',
      title = 'Notes from the garden.',
      lead = 'Experiments, ship logs, half-baked ideas, and the occasional rant about prompt engineering.',
      onOpenPost,
      ...props
    },
    ref,
  ) => {
    const [featured, ...rest] = posts;
    return (
      <div ref={ref} className={cn(portalBlogIndex(), className)} {...props}>
        <header className="mb-9 max-w-[720px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-accent">
            {eyebrow}
          </div>
          <h1 className="!m-0 !mb-3 !text-[56px] !font-bold !leading-none !tracking-[-0.025em]">
            {title}
          </h1>
          <p className="!m-0 max-w-[600px] !text-[17px] !leading-[1.6] !text-fg2">{lead}</p>
        </header>

        {featured && <FeaturedCard post={featured} onOpenPost={onOpenPost} />}

        <div className="mt-7 grid grid-cols-2 gap-6">
          {rest.map((p) => (
            <PostCard key={p.id} post={p} onOpenPost={onOpenPost} />
          ))}
        </div>
      </div>
    );
  },
);

BlogIndex.displayName = 'BlogIndex';
