import * as RadixTooltip from '@radix-ui/react-tooltip';
import * as React from 'react';

import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import { tooltipContentVariants, type TooltipVariants } from './tooltip.variants';

type RadixTooltipRootProps = React.ComponentPropsWithoutRef<typeof RadixTooltip.Root>;
type RadixTooltipContentProps = React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>;
type RadixTooltipProviderProps = React.ComponentPropsWithoutRef<typeof RadixTooltip.Provider>;

/**
 * Tooltip — single-encapsulated wrapper over Radix's Tooltip primitive that
 * pairs a consumer-supplied `trigger` element with portaled hover/focus-
 * activated text content. The molecule renders its own internal
 * `RadixTooltip.Provider` with a `delayDuration` default of `300ms`, so
 * consumers do not need to wrap their app in a Provider for the wrapper to
 * function correctly.
 *
 * @remarks All visual customization flows through `size`, `placement`, and
 * `align`. There is no `className` escape hatch. The trigger is wrapped
 * internally via `<RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>`
 * — pass a `Button` atom (or any single React element with an accessible name)
 * so Radix can project its event handlers and ARIA attributes.
 *
 * The `content` slot is wrapped in `Typography(variant="caption")` to give it
 * the small, muted tooltip text treatment. Pass plain strings or simple
 * inline nodes; tooltips are not the place for rich layout.
 *
 * @example
 * ```tsx
 * <Tooltip trigger={<Button>Save</Button>} content="Save changes (⌘S)" />
 *
 * <Tooltip
 *   size="lg"
 *   placement="right"
 *   align="start"
 *   trigger={<Button variant="ghost">?</Button>}
 *   content="Long-form explanation that can wrap to multiple lines inside the larger size axis."
 * />
 * ```
 */
export interface TooltipProps
  extends Omit<RadixTooltipRootProps, 'children'>,
  TooltipVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be a
   * single React element — fragments, strings, arrays, or `null` throw at
   * runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /** Tooltip body rendered inside the portaled Content via Typography(caption). */
  content: React.ReactNode;
  /**
   * Override the default `delayDuration` (300ms). Forwarded to the internal
   * `RadixTooltip.Provider`. Tests typically pass `0` to skip the hover delay.
   */
  delayDuration?: RadixTooltipProviderProps['delayDuration'];
  /** Forwarded to the internal `RadixTooltip.Provider`. */
  skipDelayDuration?: RadixTooltipProviderProps['skipDelayDuration'];
  /** Forwarded to the internal `RadixTooltip.Provider`. */
  disableHoverableContent?: RadixTooltipProviderProps['disableHoverableContent'];
  /**
   * Pass-through props for the underlying Radix Content (focus handlers,
   * collision boundary, side offsets, `aria-label`, etc.). `className`,
   * `side`, `align`, and `children` are owned by the molecule and excluded.
   */
  contentProps?: Omit<
    RadixTooltipContentProps,
    'className' | 'side' | 'align' | 'children'
  >;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      size,
      placement,
      align,
      trigger,
      content,
      delayDuration = 300,
      skipDelayDuration,
      disableHoverableContent,
      contentProps,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedPlacement = placement ?? 'top';
    const resolvedAlign = align ?? 'center';

    return (
      <RadixTooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        disableHoverableContent={disableHoverableContent}
      >
        <RadixTooltip.Root {...rest}>
          <RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>
          <RadixTooltip.Portal>
            <RadixTooltip.Content
              ref={ref}
              side={resolvedPlacement}
              align={resolvedAlign}
              data-slot="tooltip-content"
              data-size={resolvedSize}
              className={cn(
                tooltipContentVariants({
                  size: resolvedSize,
                  placement: resolvedPlacement,
                  align: resolvedAlign,
                }),
              )}
              {...contentProps}
            >
              <Typography variant="caption" data-slot="tooltip-body">
                {content}
              </Typography>
            </RadixTooltip.Content>
          </RadixTooltip.Portal>
        </RadixTooltip.Root>
      </RadixTooltip.Provider>
    );
  },
);
Tooltip.displayName = 'Tooltip';
