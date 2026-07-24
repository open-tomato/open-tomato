import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib';

import { codeBlockPre } from './CodeBlock.variants';

export interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children: ReactNode;
}

/**
 * CodeBlock — a charcoal `<pre>` for multi-line code in docs/blog prose. Pass
 * the code as a string child (whitespace preserved). For the marketing
 * landing's copy + terminal band, use CodeQuickstart instead.
 */
export const CodeBlock = forwardRef<HTMLPreElement, CodeBlockProps>(
  ({ className, children, ...props }, ref) => (
    <pre ref={ref} className={cn(codeBlockPre(), className)} {...props}>
      {children}
    </pre>
  ),
);

CodeBlock.displayName = 'CodeBlock';
