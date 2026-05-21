import {
  Indicator as RadixProgressIndicator,
  Root as RadixProgress,
} from '@radix-ui/react-progress';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  progressIndicatorVariants,
  progressVariants,
  type ProgressVariants,
} from './progress.variants';

type RadixProgressProps = React.ComponentPropsWithoutRef<typeof RadixProgress>;

/**
 * Progress — single encapsulated wrapper over Radix Progress
 * (root + indicator) with design-system `variant` and `size` axes.
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * Styling is the atom's responsibility — if a knob isn't covered, add a
 * variant axis instead of reaching for a class override.
 *
 * Pass `value` (0–`max`, defaults to `max=100`) to drive the indicator width.
 * When `value` is `null` or `undefined`, the underlying Radix primitive treats
 * the bar as indeterminate (`data-state="indeterminate"`) — wrappers don't
 * render an indeterminate animation; supply a known `value` to show progress.
 *
 * @example
 * ```tsx
 * <Progress value={42} />
 * <Progress value={80} variant="success" size="lg" />
 * <Progress value={null} aria-label="Loading" />
 * ```
 */
export interface ProgressProps extends Omit<RadixProgressProps, 'className'>, ProgressVariants {}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      variant,
      size,
      value,
      max,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedMax = max ?? 100;
    const hasValue = value !== null && value !== undefined;
    const clampedValue = hasValue
      ? Math.min(Math.max(value, 0), resolvedMax)
      : 0;
    const percent = hasValue
      ? (clampedValue / resolvedMax) * 100
      : 0;

    return (
      <RadixProgress
        ref={ref}
        value={value}
        max={resolvedMax}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(progressVariants({ variant: resolvedVariant, size: resolvedSize }))}
        {...rest}
      >
        <RadixProgressIndicator
          data-slot="progress-indicator"
          className={cn(progressIndicatorVariants({ variant: resolvedVariant }))}
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </RadixProgress>
    );
  },
);
Progress.displayName = 'Progress';
