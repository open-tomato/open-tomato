import * as React from 'react';

import { Card } from '@/atoms/Card';
import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import {
  emptyActionsVariants,
  emptyBodyVariants,
  type EmptyVariants,
} from './empty.variants';

/**
 * Empty — composition-only organism that frames a "no content yet" surface
 * by composing the `Card` and `Typography` atoms into a vertically stacked,
 * centered placeholder. Optional `actions` slot renders a wrapped row of
 * buttons below the description.
 *
 * @remarks All visual customization is controlled exclusively through
 * `size` and `tone`. There is no `className` escape hatch and no `className`
 * is forwarded to the composed Card or Typography atoms — variant propagation
 * lives in the `cardPaddingForSize` and `titleVariantForSize` lookup tables
 * below.
 *
 * The `tone` axis tints the optional leading-icon slot via a descendant
 * selector in `emptyBodyVariants` (`neutral` → muted; `info` → primary). The
 * `size` axis tunes Card padding, Typography variant, inter-slot gap, and
 * action-row gap; the layout (vertical stack, centered alignment) is
 * size-invariant.
 *
 * @example
 * ```tsx
 * <Empty
 *   leading={<Inbox aria-hidden />}
 *   title="No messages yet"
 *   description="Conversations will appear here once they arrive."
 * />
 *
 * <Empty
 *   size="lg"
 *   tone="info"
 *   leading={<Search aria-hidden />}
 *   title="Nothing matched"
 *   description="Try a broader query or clear the active filters."
 *   actions={
 *     <>
 *       <Button variant="ghost">Clear filters</Button>
 *       <Button>Reset search</Button>
 *     </>
 *   }
 * />
 * ```
 */
export interface EmptyProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'className'>,
  EmptyVariants {
  /** Leading icon or visual rendered above the title. Wrapped `aria-hidden`. */
  leading?: React.ReactNode;
  /** Title rendered via Typography (variant chosen by `size`). */
  title?: React.ReactNode;
  /** Supporting description rendered beneath the title via Typography. */
  description?: React.ReactNode;
  /**
   * Action row rendered beneath the description in a centered, wrapping flex
   * row. Pass one or more `Button` atoms; the organism handles row alignment.
   */
  actions?: React.ReactNode;
}

const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ size, tone, leading, title, description, actions, ...rest }, ref) => {
    const resolvedSize = size ?? 'md';
    const resolvedTone = tone ?? 'neutral';

    return (
      <Card
        ref={ref}
        variant="default"
        padding={cardPaddingForSize[resolvedSize]}
        data-slot="empty-root"
        data-size={resolvedSize}
        data-tone={resolvedTone}
        {...rest}
      >
        <div
          data-slot="empty-body"
          className={cn(emptyBodyVariants({ size: resolvedSize, tone: resolvedTone }))}
        >
          {leading !== undefined
            ? <span data-slot="empty-leading" aria-hidden>{leading}</span>
            : null}
          {title !== undefined
            ? (
              <Typography variant={titleVariantForSize[resolvedSize]}>
                {title}
              </Typography>
            )
            : null}
          {description !== undefined
            ? <Typography variant="caption">{description}</Typography>
            : null}
          {actions !== undefined
            ? (
              <div
                data-slot="empty-actions"
                className={cn(emptyActionsVariants({ size: resolvedSize }))}
              >
                {actions}
              </div>
            )
            : null}
        </div>
      </Card>
    );
  },
);
Empty.displayName = 'Empty';
