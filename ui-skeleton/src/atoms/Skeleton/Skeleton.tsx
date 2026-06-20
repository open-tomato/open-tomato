import * as React from 'react';

import { cn } from '@/particles/cn';

import { skeletonVariants, type SkeletonVariants } from './skeleton.variants';

/**
 * Skeleton — pure CVA wrapper rendered as a `<div>` for content placeholders
 * shown while data is loading. Variants choose the shape (`rect | circle | text`)
 * and the loading animation (`pulse | wave | none`). Dimensions are set
 * through the explicit `width`, `height`, and `size` props since the
 * variants only set shape, not dimensions.
 *
 * @remarks All visual customization MUST go through the variant axes
 * (`variant`, `animate`). Dimensions MUST go through `width` / `height` /
 * `size` props — `size` overrides both `width` and `height` when provided.
 * Numeric values are emitted as `${n}px`; string values pass through as-is.
 * The component does not accept `style` (it owns the inline style channel to
 * publish dimensions) and does not accept `className`. Skeleton has no
 * underlying Radix primitive — the rendered element is a plain `<div>`. The
 * component is decorative by default (no ARIA role); when announcing loading
 * state to assistive tech, wrap one or more skeletons in a parent
 * `<div role="status" aria-live="polite" aria-label="Loading">`.
 *
 * @example
 * ```tsx
 * <Skeleton width={192} height={32} />
 * <Skeleton variant="circle" size={48} />
 * <Skeleton variant="text" width="66%" />
 * <Skeleton animate="wave" width="100%" height={96} />
 * ```
 */
export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color' | 'className' | 'style'>,
  SkeletonVariants {
  /** Explicit width. Numbers emit as `${n}px`; strings pass through unchanged. */
  width?: string | number;
  /** Explicit height. Numbers emit as `${n}px`; strings pass through unchanged. */
  height?: string | number;
  /** Shorthand that sets both width and height. Overrides `width` and `height` when provided. */
  size?: string | number;
}

const toCss = (v: string | number | undefined): string | undefined => {
  if (v === undefined) return undefined;
  return typeof v === 'number'
    ? `${v}px`
    : v;
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant, animate, width, height, size, ...rest }, ref) => {
    const resolvedVariant = variant ?? 'rect';
    const resolvedAnimate = animate ?? 'pulse';

    const resolvedWidth = size !== undefined
      ? toCss(size)
      : toCss(width);
    const resolvedHeight = size !== undefined
      ? toCss(size)
      : toCss(height);

    const style: React.CSSProperties = {};
    if (resolvedWidth !== undefined) style.width = resolvedWidth;
    if (resolvedHeight !== undefined) style.height = resolvedHeight;

    return (
      <div
        ref={ref}
        data-slot="skeleton"
        data-variant={resolvedVariant}
        data-animate={resolvedAnimate}
        className={cn(skeletonVariants({ variant: resolvedVariant, animate: resolvedAnimate }))}
        style={style}
        {...rest}
      />
    );
  },
);
Skeleton.displayName = 'Skeleton';
