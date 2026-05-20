import {
  Corner as RadixScrollAreaCorner,
  Root as RadixScrollArea,
  Scrollbar as RadixScrollAreaScrollbar,
  Thumb as RadixScrollAreaThumb,
  Viewport as RadixScrollAreaViewport,
} from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaVariants,
  scrollAreaViewportVariants,
  type ScrollAreaVariants,
} from './scroll-area.variants';

type RadixScrollAreaProps = React.ComponentPropsWithoutRef<typeof RadixScrollArea>;
type RadixScrollAreaViewportProps = React.ComponentPropsWithoutRef<typeof RadixScrollAreaViewport>;
type RadixScrollAreaScrollbarProps = React.ComponentPropsWithoutRef<typeof RadixScrollAreaScrollbar>;

/**
 * ScrollArea — single encapsulated wrapper over Radix ScrollArea
 * (root + viewport + scrollbar(s) + thumb(s) + corner) with a single
 * `orientation` axis controlling which scrollbar(s) render.
 *
 * @remarks All visual customization MUST go through `orientation`. `className`
 * applies to the outer root (the visual frame); to style the scrollable inner
 * region use `viewportProps`. `scrollbarProps` is forwarded to every rendered
 * scrollbar (useful for `forceMount`, `hidden`, etc.).
 *
 * Consumers must constrain the root with width/height (Tailwind `h-*`, `w-*`)
 * for scrolling to be meaningful — the wrapper does not impose a default size.
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-72 w-48 rounded-md border">
 *   <ul className="p-4">…</ul>
 * </ScrollArea>
 *
 * <ScrollArea orientation="horizontal" className="w-96 whitespace-nowrap">
 *   <div className="flex gap-4 p-4">…</div>
 * </ScrollArea>
 * ```
 */
export interface ScrollAreaProps
  extends Omit<RadixScrollAreaProps, 'dir'>,
  ScrollAreaVariants {
  /** Reading direction; forwarded to the underlying Radix root. */
  dir?: RadixScrollAreaProps['dir'];
  /** Escape-hatch props forwarded to the inner viewport (e.g. extra `className`, `tabIndex`). */
  viewportProps?: Omit<RadixScrollAreaViewportProps, 'children'>;
  /** Escape-hatch props forwarded to every rendered scrollbar. */
  scrollbarProps?: Omit<RadixScrollAreaScrollbarProps, 'orientation' | 'children'>;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      orientation,
      children,
      viewportProps,
      scrollbarProps,
      ...rest
    },
    ref,
  ) => {
    const resolvedOrientation = orientation ?? 'vertical';
    const renderVertical = resolvedOrientation === 'vertical' || resolvedOrientation === 'both';
    const renderHorizontal = resolvedOrientation === 'horizontal' || resolvedOrientation === 'both';

    return (
      <RadixScrollArea
        ref={ref}
        data-slot="scroll-area"
        data-orientation={resolvedOrientation}
        className={cn(scrollAreaVariants({ orientation: resolvedOrientation }), className)}
        {...rest}
      >
        <RadixScrollAreaViewport
          data-slot="scroll-area-viewport"
          {...viewportProps}
          className={cn(scrollAreaViewportVariants(), viewportProps?.className)}
        >
          {children}
        </RadixScrollAreaViewport>
        {renderVertical
          ? (
            <RadixScrollAreaScrollbar
              data-slot="scroll-area-scrollbar"
              orientation="vertical"
              {...scrollbarProps}
              className={cn(
                scrollAreaScrollbarVariants({ orientation: 'vertical' }),
                scrollbarProps?.className,
              )}
            >
              <RadixScrollAreaThumb
                data-slot="scroll-area-thumb"
                className={cn(scrollAreaThumbVariants())}
              />
            </RadixScrollAreaScrollbar>
          )
          : null}
        {renderHorizontal
          ? (
            <RadixScrollAreaScrollbar
              data-slot="scroll-area-scrollbar"
              orientation="horizontal"
              {...scrollbarProps}
              className={cn(
                scrollAreaScrollbarVariants({ orientation: 'horizontal' }),
                scrollbarProps?.className,
              )}
            >
              <RadixScrollAreaThumb
                data-slot="scroll-area-thumb"
                className={cn(scrollAreaThumbVariants())}
              />
            </RadixScrollAreaScrollbar>
          )
          : null}
        {renderVertical && renderHorizontal
          ? <RadixScrollAreaCorner data-slot="scroll-area-corner" />
          : null}
      </RadixScrollArea>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';
