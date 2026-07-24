import { Breadcrumb, type SelectionItem } from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { Callout } from '../Callout';
import { CodeBlock } from '../CodeBlock';
import {
  DocsSidebar,
  type DocsNavSection,
} from '../DocsSidebar';
import { DocsTOC, type DocsTocAnchor } from '../DocsTOC';
import { cn } from '../lib';
import { Prose } from '../Prose';

import { portalDocsLayout } from './DocsLayout.variants';

/** The default quickstart article body — used when no `children` given. */
const DefaultBody = () => (
  <>
    <Callout tone="leaf" title="Heads up">
      This page assumes you&apos;ve already installed the CLI. If not, hop back
      to <a href="#install">Install</a> first.
    </Callout>
    <h2 id="step-1">1. Initialize a workspace</h2>
    <p>
      Open Tomato keeps its config in a single file at the root of your project.
      From any directory you want to run agents in:
    </p>
    <CodeBlock>{'$ tomato init'}</CodeBlock>
    <p>
      You&apos;ll see a new <code>open-tomato.config.json</code> next to your{' '}
      <code>package.json</code>. That&apos;s it — you&apos;re ready.
    </p>
    <h2 id="step-2">2. Seed your first run</h2>
    <p>
      The <code>run</code> command takes a goal in plain language. Be concrete —
      the agent reads what you write, verbatim.
    </p>
    <CodeBlock>
      {'$ tomato run "add a /healthz endpoint that returns build info" --budget 20k'}
    </CodeBlock>
    <p>
      You&apos;ll get a session ID back. Drop into the dashboard to watch it
      work, or tail the logs with <code>tomato logs --follow</code>.
    </p>
    <Callout tone="warning" title="Token budgets">
      The <code>--budget</code> flag is a hard cap. Hit it, the agent stops
      cleanly and you can decide whether to bump it. We default conservatively
      on purpose.
    </Callout>
    <h2 id="step-3">3. Review and merge</h2>
    <p>
      When the agent finishes, it leaves a clean commit on a branch named after
      the session. Review the diff, run your tests, merge or kick it back for
      another pass with <code>tomato continue</code>.
    </p>
  </>
);

const DEFAULT_BREADCRUMB: readonly SelectionItem[] = [
  { key: 'docs', label: 'Docs' },
  { key: 'getting-started', label: 'Getting started' },
  { key: 'quickstart', label: 'Quickstart' },
];

const DEFAULT_ANCHORS: readonly DocsTocAnchor[] = [
  { id: 'step-1', label: 'Initialize a workspace' },
  { id: 'step-2', label: 'Seed your first run' },
  { id: 'step-3', label: 'Review and merge' },
];

export interface DocsLayoutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Active sidebar page id. */
  active?: string;
  /** Sidebar sections (passed through to DocsSidebar). */
  sections?: readonly DocsNavSection[];
  /** Called when a sidebar link is clicked. */
  onNavigate?: (id: string) => void;
  /** Breadcrumb trail (reuses the catalog Breadcrumb; last item is current). */
  breadcrumb?: readonly SelectionItem[];
  /** Page title. */
  title?: string;
  /** Supporting lead paragraph. */
  lead?: ReactNode;
  /** Article prose body. Defaults to the quickstart article. */
  children?: ReactNode;
  /** On-page TOC anchors. */
  anchors?: readonly DocsTocAnchor[];
  /** "Edit this page" target for the TOC. */
  editHref?: string;
}

/**
 * DocsLayout — the docs page shell. Composes the shared catalog: DocsSidebar
 * (left), the catalog Breadcrumb (reused, not rebuilt — the trail is static,
 * so its index is pinned to the last item), Prose + Callout + CodeBlock for
 * the body, and DocsTOC (right). The docs site renders page content through
 * `children`; the defaults render the quickstart page.
 */
export const DocsLayout = forwardRef<HTMLDivElement, DocsLayoutProps>(
  (
    {
      className,
      active = 'quickstart',
      sections,
      onNavigate,
      breadcrumb = DEFAULT_BREADCRUMB,
      title = 'Quickstart',
      lead = 'You\'ve got the CLI installed. Now let\'s seed your first agent run and watch it do something useful. Should take under five minutes.',
      children,
      anchors = DEFAULT_ANCHORS,
      editHref = '#edit',
      ...props
    },
    ref,
  ) => (
    <div ref={ref} className={cn(portalDocsLayout(), className)} {...props}>
      <DocsSidebar sections={sections} active={active} onNavigate={onNavigate} />

      <article className="min-w-0">
        <Breadcrumb items={breadcrumb} index={breadcrumb.length - 1} />
        <h1 className="!mb-1.5 !mt-2 !text-[44px] !font-bold !leading-[1.05] !tracking-[-0.02em]">
          {title}
        </h1>
        <p className="!mb-6 !mt-0 max-w-[640px] !text-[17px] !leading-[1.6] !text-fg2">
          {lead}
        </p>
        <Prose>{children ?? <DefaultBody />}</Prose>
      </article>

      <DocsTOC anchors={anchors} editHref={editHref} />
    </div>
  ),
);

DocsLayout.displayName = 'DocsLayout';
