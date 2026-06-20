import * as React from 'react';

import { cn } from '@/particles/cn';

import { badgeVariants, type BadgeVariants } from './badge.variants';

/**
 * Badge — pure CVA wrapper rendered as a `<span>` for inline status, count, or
 * label affordances.
 *
 * @remarks All visual customization is controlled exclusively through
 * `variant` and `size`. There is no `className` escape hatch — if a knob is
 * missing, add a variant axis instead. Badge has no underlying Radix primitive
 * — the rendered element is a plain `<span>` so it composes safely inside
 * paragraphs, buttons, list items, etc.
 *
 * @example
 * ```tsx
 * <Badge>New</Badge>
 * <Badge variant="destructive" size="sm">3</Badge>
 * <Badge variant="outline">Beta</Badge>
 * ```
 */
export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color' | 'className'>,
  BadgeVariants {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, size, ...rest }, ref) => {
    const resolvedVariant = variant ?? 'primary';
    const resolvedSize = size ?? 'md';

    return (
      <span
        ref={ref}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(badgeVariants({ variant: resolvedVariant, size: resolvedSize }))}
        {...rest}
      />
    );
  },
);
Badge.displayName = 'Badge';
