import * as React from 'react';

import { type ButtonProps } from '@/atoms/Button';
import { cn } from '@/particles/cn';

import { buttonGroupVariants, type ButtonGroupVariants } from './button-group.variants';

/**
 * ButtonGroup — stateless molecule that composes N `Button` atoms into a
 * single horizontal or vertical group, optionally rendered as a segmented
 * (attached) control.
 *
 * @remarks All visual customization flows through `orientation`, `attached`,
 * `size`, and `variant`. There is no `className` escape hatch. `size` and
 * `variant` are propagated to each `Button` child via `React.cloneElement` and
 * only when the child does not already declare them — per-button overrides
 * always win.
 *
 * When `attached` is `true`, neighboring buttons share borders via
 * neighbor-sibling Tailwind selectors on the wrapper (negative margin to
 * collapse the duplicated 1px border, plus radius reset on inner edges).
 * Focused buttons are lifted via `position: relative; z-index: 10` so the
 * focus ring isn't clipped by the next button's negative margin.
 *
 * @example
 * ```tsx
 * <ButtonGroup variant="outline" size="sm">
 *   <Button>Left</Button>
 *   <Button>Middle</Button>
 *   <Button>Right</Button>
 * </ButtonGroup>
 *
 * <ButtonGroup attached orientation="vertical" variant="outline">
 *   <Button>Top</Button>
 *   <Button>Bottom</Button>
 * </ButtonGroup>
 * ```
 */
export interface ButtonGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>,
  ButtonGroupVariants {
  /** Button size propagated to each Button child that does not declare its own. */
  size?: ButtonProps['size'];
  /** Button variant propagated to each Button child that does not declare its own. */
  variant?: ButtonProps['variant'];
  /** Button children to group. Non-element children (strings, null, fragments) pass through unchanged. */
  children: React.ReactNode;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  (
    {
      orientation,
      attached,
      size,
      variant,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedOrientation = orientation ?? 'horizontal';
    const resolvedAttached = attached ?? false;

    const propagatedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement<Partial<ButtonProps>>(child)) {
        return child;
      }
      return React.cloneElement(child, {
        size: child.props.size ?? size,
        variant: child.props.variant ?? variant,
      });
    });

    return (
      <div
        ref={ref}
        role="group"
        data-slot="button-group-root"
        data-orientation={resolvedOrientation}
        data-attached={resolvedAttached
          ? ''
          : undefined}
        className={cn(buttonGroupVariants({
          orientation: resolvedOrientation,
          attached: resolvedAttached,
        }))}
        {...rest}
      >
        {propagatedChildren}
      </div>
    );
  },
);
ButtonGroup.displayName = 'ButtonGroup';
