import type { BlogPostMeta } from '../BlogIndex/BlogIndex';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

// Deep member imports (not the `../BlogIndex` barrel): pulling the
// `postCategoryText` value through a multi-file barrel is the barrel-init
// chunking hazard — the built storybook can drop it (React #130). See the
// skill's Known hazards.
import { postCategoryText } from '../BlogIndex/BlogIndex.variants';
import { Callout } from '../Callout';
import { CodeBlock } from '../CodeBlock';
import { cn } from '../lib';
import { Prose } from '../Prose';

import {
  blogAuthorAvatar,
  blogFooterLink,
  portalBlogPost,
} from './BlogPost.variants';

/** The default compost article body — used when no `children` are passed. */
const DefaultBody = ({ excerpt }: { excerpt: string }) => (
  <>
    <p className="!mt-0 !text-[19px] !text-fg2">{excerpt}</p>
    <p>
      One of the things that consistently breaks long agent sessions is context
      rot. The model accumulates a wall of intermediate thinking, half-finished
      plans, file reads it already used, and an ever-growing wall of &quot;what
      was I doing again?&quot; by the time it&apos;s been running for an hour.
    </p>
    <p>
      We&apos;ve spent the last few weeks experimenting with what we&apos;re
      calling <em>context compost</em> — a structured way to summarize, prune,
      and eventually drop stale context. Like a compost heap, the ingredients
      that are still useful get reabsorbed into a richer base, and the rest goes
      back into the dirt.
    </p>
    <Callout tone="leaf" title="A quick definition">
      By &quot;compost&quot; we mean: every N turns, the agent pauses,
      summarizes everything it has so far into a shorter representation, and
      then evicts the raw messages that contributed to that summary.
    </Callout>
    <h2>What we tried</h2>
    <p>
      The first version was dead simple. Every 20 tool calls, we&apos;d ask the
      agent to write a one-paragraph summary of &quot;what have you learned,
      what&apos;s decided, what&apos;s left,&quot; then drop everything except
      the summary and the last 5 turns. We expected it to be lossy. It
      wasn&apos;t. The model picked up exactly where it left off — in fact,
      agents <em>liked</em> the cleaner context.
    </p>
    <p>
      The second version added structured fields to the summary:{' '}
      <code>decisions</code>, <code>open_questions</code>,{' '}
      <code>files_touched</code>. This was worse. The agent spent too much time
      worrying about the schema. Less is more.
    </p>
    <CodeBlock>{`# the compost prompt that worked best
You are about to compact your own working memory.
Write ONE paragraph (no more) summarizing what you know,
what's decided, and what's left. Be concrete about files
and decisions. Then we'll drop the older messages.`}</CodeBlock>
    <h2>What&apos;s next</h2>
    <p>
      We&apos;re shipping the simple version next week as{' '}
      <code>--compost auto</code>. The structured version stays in the lab. If
      you want to play with it early, the <code>compost-experiments</code>{' '}
      branch is open and we&apos;d love your weird ideas.
    </p>
    <p>Come tell us what you&apos;d try. The garden is open.</p>
  </>
);

export interface BlogPostProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The post being read (meta + tone). */
  post: BlogPostMeta;
  /** Author byline blurb under the handle. */
  authorBlurb?: string;
  /** Article prose body. Defaults to the compost article. */
  children?: ReactNode;
  /** Tag line in the footer. */
  tags?: string;
  /** Called when the back link is clicked. */
  onBack?: () => void;
  /** Previous-post link target. */
  prevHref?: string;
  /** Next-post link target. */
  nextHref?: string;
}

/**
 * BlogPost — the article reading layout. Composes the shared Prose / Callout /
 * CodeBlock so the body typography matches docs. The category color and author
 * avatar reuse the post's shared blog tone. The lead paragraph is the post
 * excerpt, sized up inside the prose.
 */
export const BlogPost = forwardRef<HTMLDivElement, BlogPostProps>(
  (
    {
      className,
      post,
      authorBlurb = 'writes about agents and weird ideas',
      children,
      tags = 'experiment · context · agents',
      onBack,
      prevHref = '#prev',
      nextHref = '#next',
      ...props
    },
    ref,
  ) => (
    <div ref={ref} className={cn(portalBlogPost(), className)} {...props}>
      <button
        type="button"
        onClick={onBack}
        className="-ml-2.5 mb-3.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-fg2 hover:bg-surface-sunk"
      >
        ← back to blog
      </button>

      <div className="mb-3.5 flex items-center gap-3">
        <span className={cn(postCategoryText({ tone: post.tone }), 'text-[11px] tracking-[0.05em]')}>
          {post.category}
        </span>
        <span className="text-fg3">·</span>
        <span className="text-xs text-fg3">{post.date}</span>
        <span className="text-fg3">·</span>
        <span className="text-xs text-fg3">{post.readtime} read</span>
      </div>

      <h1 className="!mb-5 !mt-0 !text-[48px] !font-bold !leading-[1.05] !tracking-[-0.025em]">
        {post.title}
      </h1>

      <div className="mb-8 flex items-center gap-3 border-b border-border-soft pb-6">
        <div className={blogAuthorAvatar({ tone: post.tone })}>
          {(post.author[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-fg1">@{post.author}</div>
          <div className="text-xs text-fg3">{authorBlurb}</div>
        </div>
      </div>

      <Prose>{children ?? <DefaultBody excerpt={post.excerpt} />}</Prose>

      <div className="mt-12 flex items-center justify-between border-t border-border-soft pt-6">
        <div className="font-mono text-xs text-fg3">tagged: {tags}</div>
        <div className="flex gap-1.5">
          <a href={prevHref} className={blogFooterLink()}>
            ← previous post
          </a>
          <span className="text-fg3">·</span>
          <a href={nextHref} className={blogFooterLink()}>
            next post →
          </a>
        </div>
      </div>
    </div>
  ),
);

BlogPost.displayName = 'BlogPost';
