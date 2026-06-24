import * as RadixHoverCard from '@radix-ui/react-hover-card';
import * as React from 'react';

import { Card } from '@/atoms/Card';
import { cn } from '@/particles/cn';

import {
  hoverCardContentVariants,
  type HoverCardVariants,
} from './hover-card.variants';

type RadixHoverCardRootProps = React.ComponentPropsWithoutRef<typeof RadixHoverCard.Root>;
type RadixHoverCardContentProps = React.ComponentPropsWithoutRef<typeof RadixHoverCard.Content>;

/**
 * HoverCard — single-encapsulated wrapper over Radix's HoverCard primitive
 * that pairs a consumer-supplied `trigger` element with portaled
 * hover/focus-activated rich content. The molecule always composes the
 * `Card` atom (`variant="elevated"`) inside the portaled Content, supplying
 * the surface (border, bg, shadow, padding) so consumer `content` renders
 * as the body of a structured card.
 *
 * @remarks All visual customization flows through `size` and `placement`.
 * There is no `className` escape hatch. The trigger is wrapped internally
 * via `<RadixHoverCard.Trigger asChild>{trigger}</RadixHoverCard.Trigger>`
 * — pass a `Button`, an `<a>`, or any single React element with an
 * accessible name so Radix can project its event handlers.
 *
 * Hover and focus open the card after `openDelay` (Radix default 700ms);
 * blur and pointer-leave close it after `closeDelay` (Radix default 300ms).
 * Tests typically pass `openDelay={0}` to skip the dwell.
 *
 * @example
 * ```tsx
 * <HoverCard trigger={<a href="/u/jane">@jane</a>}>
 *   <div>
 *     <strong>Jane Doe</strong>
 *     <p>Frontend engineer. Joined April 2024.</p>
 *   </div>
 * </HoverCard>
 *
 * <HoverCard
 *   size="lg"
 *   placement="right"
 *   openDelay={0}
 *   trigger={<Button variant="ghost">Preview</Button>}
 * >
 *   <RichPreview />
 * </HoverCard>
 * ```
 */
export interface HoverCardProps
  extends Omit<RadixHoverCardRootProps, 'children'>,
  HoverCardVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be a
   * single React element — fragments, strings, arrays, or `null` throw at
   * runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /** Body content rendered inside the composed Card. */
  children?: React.ReactNode;
  /**
   * Pass-through props for the underlying Radix Content (focus handlers,
   * collision boundary, side offsets, `aria-label`, etc.). `className`,
   * `side`, and `children` are owned by the molecule and excluded.
   */
  contentProps?: Omit<
    RadixHoverCardContentProps,
    'className' | 'side' | 'children'
  >;
}

const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

export const HoverCard = React.forwardRef<HTMLDivElement, HoverCardProps>(
  (
    {
      size,
      placement,
      trigger,
      children,
      contentProps,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedPlacement = placement ?? 'bottom';

    return (
      <RadixHoverCard.Root {...rest}>
        <RadixHoverCard.Trigger asChild>{trigger}</RadixHoverCard.Trigger>
        <RadixHoverCard.Portal>
          <RadixHoverCard.Content
            ref={ref}
            side={resolvedPlacement}
            data-slot="hover-card-content"
            data-size={resolvedSize}
            className={cn(
              hoverCardContentVariants({
                size: resolvedSize,
                placement: resolvedPlacement,
              }),
            )}
            {...contentProps}
          >
            <Card
              variant="elevated"
              padding={cardPaddingForSize[resolvedSize]}
            >
              {children}
            </Card>
          </RadixHoverCard.Content>
        </RadixHoverCard.Portal>
      </RadixHoverCard.Root>
    );
  },
);
HoverCard.displayName = 'HoverCard';
