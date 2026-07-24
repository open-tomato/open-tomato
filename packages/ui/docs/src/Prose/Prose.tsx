import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib';

export interface ProseProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Prose — the scoped rich-text container for docs/blog article bodies. It
 * applies the `portal-prose` class, whose element rules (`.portal-prose
 * h2`/`p`/`code`/`em`/lists/links) live in `src/styles/theme.css`.
 *
 * PROSE-TYPOGRAPHY DECISION: docs/blog bodies are open-ended rich text — in
 * real use rendered from markdown/MDX — so the per-element `!` utility
 * approach the hand-authored marketing headings use does not scale to content
 * the library does not author. Instead the typography is a SCOPED element
 * block scoped to `.portal-prose`, which outranks the bare `h*`/`p` element
 * rules by specificity and ships in both the workbench and the published
 * bundle. Callout / CodeBlock render inside prose as their own components.
 */
export const Prose = forwardRef<HTMLDivElement, ProseProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('portal-prose', className)} {...props}>
      {children}
    </div>
  ),
);

Prose.displayName = 'Prose';
