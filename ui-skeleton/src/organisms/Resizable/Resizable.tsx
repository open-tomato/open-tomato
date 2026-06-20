import { GripVertical } from 'lucide-react';
import * as React from 'react';
import {
  Group as RrpGroup,
  Panel as RrpPanel,
  Separator as RrpSeparator,
} from 'react-resizable-panels';

import { cn } from '@/particles/cn';

import {
  resizableHandleDecorationVariants,
  resizableHandleVariants,
  resizablePanelVariants,
  resizableVariants,
  type ResizableVariants,
} from './resizable.variants';

type RrpGroupProps = React.ComponentPropsWithoutRef<typeof RrpGroup>;

/**
 * Panel descriptor — discriminated `type: 'panel'`. Renders as a
 * `react-resizable-panels` Panel with size constraints forwarded directly.
 * `id` doubles as the React key (when supplied) and the `data-panel`
 * attribute; the library falls back to a `useId`-generated id when omitted.
 */
export interface ResizablePanelEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'panel';
  /**
   * Stable identifier within the Group. Doubles as the React key and the
   * `data-panel` attribute. Required when persisting layouts via the
   * library's `useDefaultLayout` hook; otherwise optional.
   */
  id?: string | number;
  /**
   * Initial size as a percentage of the parent Group (`0..100`) or a CSS
   * length string (`'33%'`, `'200px'`, `'10rem'`). Numbers are interpreted
   * as pixels; bare strings without a unit are interpreted as percentages.
   */
  defaultSize?: number | string;
  /** Minimum size in the same unit vocabulary as `defaultSize`. */
  minSize?: number | string;
  /** Maximum size in the same unit vocabulary as `defaultSize`. */
  maxSize?: number | string;
  /** Panel body content. */
  content: React.ReactNode;
  /**
   * Disables resize for this panel — the surrounding panels can still be
   * resized indirectly via other enabled handles. Forwarded as the
   * library's `disabled` prop.
   */
  disabled?: boolean;
}

/**
 * Handle descriptor — discriminated `type: 'handle'`. Renders as a
 * `react-resizable-panels` Separator with optional grip decoration.
 * Consumers explicitly interleave handles between panels; the organism
 * does NOT auto-inject them.
 */
export interface ResizableHandleEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'handle';
  /**
   * Renders a visible grip indicator centered on the handle. Defaults to
   * `false` — the bare 1px bar is sufficient when the surrounding panels
   * already cue the resize edge. Toggle on when the layout is dense and
   * the drag affordance benefits from a tangible cue.
   */
  withHandle?: boolean;
  /**
   * Disables the resize affordance for this handle. The panels may still
   * be resized indirectly via other enabled handles.
   */
  disabled?: boolean;
}

/**
 * Items[] descriptor union. The required `type` discriminator narrows
 * each entry in `items.map(...)` between panel-shape and handle-shape
 * branches.
 */
export type ResizableItem = ResizablePanelEntry | ResizableHandleEntry;

/**
 * Resizable — items[]-driven organism that wraps `react-resizable-panels`
 * for a resizable panel layout. The `items` prop is a discriminated union
 * of `{ type: 'panel' }` and `{ type: 'handle' }` descriptors rendered in
 * order; consumers explicitly interleave handles between panels so the
 * organism does NOT auto-inject them.
 *
 * @remarks All visual customization flows through the `direction` axis,
 * which propagates to the underlying Group's `orientation` prop and to the
 * handle's cross-axis thickness and decoration rotation. There is no
 * `className` escape hatch.
 *
 * `react-resizable-panels` owns the layout math (drag tracking, min/max
 * clamping, optional collapse) and the ARIA wiring (`role="separator"`
 * on each handle with `aria-controls` referencing the adjacent panel ids,
 * `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`).
 * Tests can scan `container` rather than `document.body` — the library
 * renders inline and does not use a portal.
 *
 * @example
 * ```tsx
 * <Resizable
 *   items={[
 *     { type: 'panel', id: 'nav', defaultSize: 25, minSize: 15, content: <Nav /> },
 *     { type: 'handle', withHandle: true },
 *     { type: 'panel', id: 'main', defaultSize: 75, content: <Main /> },
 *   ]}
 * />
 *
 * <Resizable
 *   direction="vertical"
 *   items={[
 *     { type: 'panel', id: 'top', defaultSize: 60, content: <Top /> },
 *     { type: 'handle' },
 *     { type: 'panel', id: 'bottom', defaultSize: 40, content: <Bottom /> },
 *   ]}
 * />
 * ```
 */
export interface ResizableProps
  extends Omit<
    RrpGroupProps,
    | 'children'
    | 'className'
    | 'orientation'
    | 'elementRef'
  >,
  ResizableVariants {
  /** Items rendered as panels and handles, in order. */
  items: ResizableItem[];
}

type ResolvedDirection = NonNullable<ResizableVariants['direction']>;

export const Resizable = React.forwardRef<HTMLDivElement, ResizableProps>(
  (props, ref) => {
    const { items, direction, ...rest } = props;
    const resolvedDirection: ResolvedDirection = direction ?? 'horizontal';

    return (
      <RrpGroup
        elementRef={ref}
        orientation={resolvedDirection}
        data-slot="resizable-root"
        data-direction={resolvedDirection}
        className={cn(resizableVariants({ direction: resolvedDirection }))}
        {...rest}
      >
        {items.map((item, index) => {
          if (item.type === 'handle') {
            const withHandle = item.withHandle ?? false;
            return (
              <RrpSeparator
                key={`resizable-handle-${index}`}
                disabled={item.disabled}
                data-slot="resizable-handle"
                data-direction={resolvedDirection}
                data-with-handle={withHandle
                  ? 'true'
                  : 'false'}
                data-disabled={item.disabled
                  ? 'true'
                  : 'false'}
                className={cn(resizableHandleVariants({
                  direction: resolvedDirection,
                }))}
              >
                {withHandle
                  ? (
                    <span
                      aria-hidden
                      data-slot="resizable-handle-decoration"
                      className={cn(resizableHandleDecorationVariants({
                        direction: resolvedDirection,
                      }))}
                    >
                      <GripVertical aria-hidden />
                    </span>
                  )
                  : null}
              </RrpSeparator>
            );
          }
          const resolvedId = item.id !== undefined
            ? String(item.id)
            : undefined;
          return (
            <RrpPanel
              key={resolvedId ?? `resizable-panel-${index}`}
              id={resolvedId}
              defaultSize={item.defaultSize}
              minSize={item.minSize}
              maxSize={item.maxSize}
              disabled={item.disabled}
              data-slot="resizable-panel"
              className={cn(resizablePanelVariants())}
            >
              {item.content}
            </RrpPanel>
          );
        })}
      </RrpGroup>
    );
  },
);
Resizable.displayName = 'Resizable';
