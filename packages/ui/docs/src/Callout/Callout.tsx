import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib';

import { calloutBlock, type CalloutVariants } from './Callout.variants';

export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
  CalloutVariants {
  /** Bold lead line above the body. */
  title?: ReactNode;
  children: ReactNode;
}

/**
 * Callout — a tone-tinted admonition for docs/blog prose. Composes inside
 * `Prose`; the title/body colors are fixed (fg1) so it reads on either page
 * tone. Tones: `leaf` (default), `warning`, `danger`.
 */
export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, tone, title, children, ...props }, ref) => (
    <div ref={ref} className={cn(calloutBlock({ tone }), className)} {...props}>
      {title && <div className="mb-1 font-bold text-fg1">{title}</div>}
      <div className="text-sm leading-[1.6] text-fg1">{children}</div>
    </div>
  ),
);

Callout.displayName = 'Callout';
