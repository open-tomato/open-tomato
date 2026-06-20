import * as RadixPopover from '@radix-ui/react-popover';
import * as React from 'react';

import { Card } from '@/atoms/Card';
import { cn } from '@/particles/cn';

import {
  popoverContentSurfaceVariants,
  popoverContentVariants,
  type PopoverVariants,
} from './popover.variants';

type RadixPopoverRootProps = React.ComponentPropsWithoutRef<typeof RadixPopover.Root>;
type RadixPopoverContentProps = React.ComponentPropsWithoutRef<typeof RadixPopover.Content>;

/**
 * Popover — single-encapsulated wrapper over Radix's Popover primitive that
 * pairs a consumer-supplied `trigger` element with portaled content. When
 * `title` and/or `description` slot props are provided, the molecule composes
 * the `Card` atom inside the portaled Content for a structured header layout;
 * otherwise children render directly inside the Content with surface styling
 * supplied by the variant axes.
 *
 * @remarks All visual customization flows through `size`, `placement`, and
 * `align`. There is no `className` escape hatch. The trigger is wrapped
 * internally via `<RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>`
 * — pass a `Button` atom (or any single React element with an accessible name)
 * so Radix can project its event handlers and ARIA attributes.
 *
 * Defaults to `modal={false}` (non-modal) so background pointer events remain
 * live. Pass `modal` to opt into dialog-style focus trapping.
 *
 * @example
 * ```tsx
 * <Popover trigger={<Button>Open</Button>} title="Settings" description="Tune behavior.">
 *   <p>Body content</p>
 * </Popover>
 *
 * <Popover
 *   size="lg"
 *   placement="right"
 *   align="start"
 *   trigger={<Button variant="ghost">More</Button>}
 * >
 *   <CustomForm />
 * </Popover>
 * ```
 */
export interface PopoverProps
  extends Omit<RadixPopoverRootProps, 'children'>,
  PopoverVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be a
   * single React element — fragments, strings, arrays, or `null` throw at
   * runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /** Body content rendered inside the portaled popover. */
  children?: React.ReactNode;
  /**
   * Title rendered inside the composed Card's header. Presence of `title` or
   * `description` switches the molecule into Card-composition mode.
   */
  title?: React.ReactNode;
  /** Supporting description rendered beneath the title inside the Card header. */
  description?: React.ReactNode;
  /**
   * Pass-through props for the underlying Radix Content (focus handlers,
   * collision boundary, side offsets, etc.). `className`, `side`, `align`,
   * and `children` are owned by the molecule and excluded.
   */
  contentProps?: Omit<
    RadixPopoverContentProps,
    'className' | 'side' | 'align' | 'children'
  >;
}

const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  (
    {
      size,
      placement,
      align,
      modal = false,
      trigger,
      children,
      title,
      description,
      contentProps,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedPlacement = placement ?? 'bottom';
    const resolvedAlign = align ?? 'center';
    const hasCard = title !== undefined || description !== undefined;

    return (
      <RadixPopover.Root modal={modal} {...rest}>
        <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
        <RadixPopover.Portal>
          <RadixPopover.Content
            ref={ref}
            side={resolvedPlacement}
            align={resolvedAlign}
            data-slot="popover-content"
            data-size={resolvedSize}
            className={cn(
              popoverContentVariants({
                size: resolvedSize,
                placement: resolvedPlacement,
                align: resolvedAlign,
              }),
              !hasCard && popoverContentSurfaceVariants({ size: resolvedSize }),
            )}
            {...contentProps}
          >
            {hasCard
              ? (
                <Card
                  variant="elevated"
                  padding={cardPaddingForSize[resolvedSize]}
                  title={title}
                  description={description}
                >
                  {children}
                </Card>
              )
              : children}
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    );
  },
);
Popover.displayName = 'Popover';
