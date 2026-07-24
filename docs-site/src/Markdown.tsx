import { CodeBlock } from '@open-tomato/ui-docs';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { useNavigate } from 'react-router';
import remarkGfm from 'remark-gfm';

import { slugify } from './content';

/** Flatten a React children tree to plain text (for heading anchor ids). */
const nodeText = (node: ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
};

/** Internal `/…` links navigate via the router; external links open safely. */
const MarkdownLink = ({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) => {
  const navigate = useNavigate();
  const isInternal = href.startsWith('/');
  if (isInternal) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href);
        }}
        {...props}
      >
        {children}
      </a>
    );
  }
  const isAnchor = href.startsWith('#');
  return (
    <a
      href={href}
      {...(isAnchor
        ? {}
        : { target: '_blank', rel: 'noreferrer noopener' })}
      {...props}
    >
      {children}
    </a>
  );
};

const heading = (Tag: 'h2' | 'h3') => {
  const H = ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <Tag id={slugify(nodeText(children))} {...props}>
      {children}
    </Tag>
  );
  H.displayName = `Markdown_${Tag}`;
  return H;
};

const COMPONENTS: Components = {
  h2: heading('h2'),
  h3: heading('h3'),
  a: MarkdownLink,
  // Block code — react-markdown wraps fenced blocks in <pre><code>; render the
  // <pre> as the ui-docs CodeBlock (a styled <pre>). Inline `code` keeps the
  // default element, styled by the portal-prose scope.
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <CodeBlock>{children}</CodeBlock>,
  // GFM tables can be wider than the article column — let them scroll inside
  // their own container so the page body never scrolls horizontally.
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <div className="my-4 overflow-x-auto">
      <table {...props}>{children}</table>
    </div>
  ),
};

export interface MarkdownProps {
  children: string;
}

/** Render a markdown string with GFM, mapped onto the ui-docs component set. */
export const Markdown = ({ children }: MarkdownProps) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
    {children}
  </ReactMarkdown>
);
