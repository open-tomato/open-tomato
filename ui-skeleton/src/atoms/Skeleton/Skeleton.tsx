import * as React from 'react';

import { cn } from '@/particles/cn';

import { skeletonVariants, type SkeletonVariants } from './skeleton.variants';

/**
 * Skeleton — pure CVA wrapper rendered as a `<div>` for content placeholders
 * shown while data is loading. Variants choose the shape (`rect | circle | text`)
 * and the loading animation (`pulse | wave | none`).
 *
 * @remarks All visual customization MUST go through `variant` and `animate`.
 * `className` is an escape hatch only and is discouraged in this design system,
 * though it is the intended channel for sizing (`w-*`, `h-*`) since the
 * variants only set shape, not dimensions. Skeleton has no underlying Radix
 * primitive — the rendered element is a plain `<div>`. The component is
 * decorative by default (no ARIA role); when announcing loading state to
 * assistive tech, wrap one or more skeletons in a parent
 * `<div role="status" aria-live="polite" aria-label="Loading">`.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-8 w-48" />
 * <Skeleton variant="circle" className="size-12" />
 * <Skeleton variant="text" className="w-2/3" />
 * <Skeleton animate="wave" className="h-24 w-full" />
 * ```
 */
export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
  SkeletonVariants {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, animate, ...rest }, ref) => {
    const resolvedVariant = variant ?? 'rect';
    const resolvedAnimate = animate ?? 'pulse';

    return (
      <div
        ref={ref}
        data-slot="skeleton"
        data-variant={resolvedVariant}
        data-animate={resolvedAnimate}
        className={cn(
          skeletonVariants({ variant: resolvedVariant, animate: resolvedAnimate }),
          className,
        )}
        {...rest}
      />
    );
  },
);
Skeleton.displayName = 'Skeleton';
