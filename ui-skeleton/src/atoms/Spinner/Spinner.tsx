import * as React from 'react';

import { cn } from '@/particles/cn';

import { spinnerVariants, type SpinnerVariants } from './spinner.variants';

/**
 * Spinner — pure CVA wrapper rendered as a `<div>` with `animate-spin`. The
 * visible spinning ring is produced by a circular border whose top edge is
 * transparent (`border-current border-t-transparent rounded-full`); the
 * `variant` axis drives the ring color (`text-*`) and the `size` axis drives
 * both dimensions and border thickness.
 *
 * @remarks All visual customization is controlled exclusively through
 * `variant` and `size`. There is no `className` escape hatch — if a knob is
 * missing, add a variant axis instead. Spinner has no underlying Radix
 * primitive — the rendered element is a plain `<div>` so it composes safely
 * inline with text, inside buttons, cards, etc.
 *
 * Accessibility: by default Spinner renders with `role="status"` and an
 * `aria-label` of `'Loading'`, plus a visually hidden `<span class="sr-only">`
 * carrying the same text so screen readers announce the loading state. Pass
 * `label="…"` to customize the announcement, or `label=""` for purely
 * decorative use (e.g. when the spinner sits next to a separately-labelled
 * loading message); decorative spinners are marked `aria-hidden="true"` and
 * carry no role.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner variant="primary" size="lg" label="Saving" />
 * <Button loading><Spinner size="sm" label="" /> Saving…</Button>
 * ```
 */
export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color' | 'children' | 'className'>,
  SpinnerVariants {
  /**
   * Accessible label announced by screen readers. Defaults to `'Loading'`.
   * Pass an empty string (`label=""`) to render the spinner as a purely
   * decorative element with `aria-hidden="true"` and no `role`.
   */
  label?: string;
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      variant,
      size,
      label,
      role,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedLabel = label ?? 'Loading';
    const isDecorative = resolvedLabel === '';

    return (
      <div
        ref={ref}
        data-slot="spinner"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        role={role ?? (isDecorative
          ? undefined
          : 'status')}
        aria-label={ariaLabel ?? (isDecorative
          ? undefined
          : resolvedLabel)}
        aria-hidden={isDecorative
          ? true
          : undefined}
        className={cn(
          spinnerVariants({ variant: resolvedVariant, size: resolvedSize }),
        )}
        {...rest}
      >
        {!isDecorative && <span className="sr-only">{resolvedLabel}</span>}
      </div>
    );
  },
);
Spinner.displayName = 'Spinner';
