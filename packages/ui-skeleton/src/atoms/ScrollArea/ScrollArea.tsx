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
  type ScrollAreaViewportVariants,
} from './scroll-area.variants';

type RadixScrollAreaProps = React.ComponentPropsWithoutRef<typeof RadixScrollArea>;
type RadixScrollAreaViewportProps = React.ComponentPropsWithoutRef<typeof RadixScrollAreaViewport>;
type RadixScrollAreaScrollbarProps = React.ComponentPropsWithoutRef<typeof RadixScrollAreaScrollbar>;

/**
 * ScrollArea — single encapsulated wrapper over Radix ScrollArea
 * (root + viewport + scrollbar(s) + thumb(s) + corner) with axes for
 * `orientation` (which scrollbar(s) render), `frame` (outer visual frame),
 * and `viewportPadding` (inner viewport padding).
 *
 * @remarks All visual customization MUST go through variants. Consumers must
 * constrain the root with width/height by wrapping the component in a sized
 * container — the wrapper does not impose a default size. `viewportProps` and
 * `scrollbarProps` are non-styling escape hatches for native attributes (e.g.
 * `tabIndex`, `forceMount`, `hidden`); they cannot supply `className`.
 *
 * @example
 * ```tsx
 * <div className="h-72 w-48">
 *   <ScrollArea frame="bordered" viewportPadding="md">
 *     <ul>…</ul>
 *   </ScrollArea>
 * </div>
 *
 * <ScrollArea orientation="horizontal" frame="card" viewportPadding="md">
 *   <div className="flex gap-4 whitespace-nowrap">…</div>
 * </ScrollArea>
 * ```
 */
export interface ScrollAreaProps
  extends Omit<RadixScrollAreaProps, 'dir' | 'className' | 'children'>,
  ScrollAreaVariants {
  /** Reading direction; forwarded to the underlying Radix root. */
  dir?: RadixScrollAreaProps['dir'];
  /** Scrollable content. */
  children?: React.ReactNode;
  /** Padding applied to the inner viewport. */
  viewportPadding?: ScrollAreaViewportVariants['padding'];
  /** Non-styling props forwarded to the inner viewport (e.g. `tabIndex`, ARIA). */
  viewportProps?: Omit<RadixScrollAreaViewportProps, 'children' | 'className'>;
  /** Non-styling props forwarded to every rendered scrollbar (e.g. `forceMount`, `hidden`). */
  scrollbarProps?: Omit<RadixScrollAreaScrollbarProps, 'orientation' | 'children' | 'className'>;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      orientation,
      frame,
      viewportPadding,
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
        className={cn(scrollAreaVariants({ orientation: resolvedOrientation, frame }))}
        {...rest}
      >
        <RadixScrollAreaViewport
          data-slot="scroll-area-viewport"
          {...viewportProps}
          className={cn(scrollAreaViewportVariants({ padding: viewportPadding }))}
        >
          {children}
        </RadixScrollAreaViewport>
        {renderVertical
          ? (
            <RadixScrollAreaScrollbar
              data-slot="scroll-area-scrollbar"
              orientation="vertical"
              {...scrollbarProps}
              className={cn(scrollAreaScrollbarVariants({ orientation: 'vertical' }))}
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
              className={cn(scrollAreaScrollbarVariants({ orientation: 'horizontal' }))}
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
