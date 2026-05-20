import { Root as RadixLabel } from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  labelRequiredIndicatorVariants,
  labelVariants,
  type LabelVariants,
} from './label.variants';

type RadixLabelProps = React.ComponentPropsWithoutRef<typeof RadixLabel>;

/**
 * Label — single encapsulated wrapper over Radix `@radix-ui/react-label`.
 *
 * @remarks All visual customization MUST go through the `size` variant.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * When `required` is `true`, the wrapper renders a visual indicator
 * (`*` by default) after the children with `aria-hidden` set. The marker is
 * purely cosmetic — set the linked input's `required` / `aria-required`
 * attributes so assistive tech announces the requirement.
 *
 * Use `htmlFor` to associate the label with a form control via its `id`. The
 * underlying Radix Label avoids triggering double-fire on labelable children
 * (e.g. clicks on a nested button do not also trigger the label).
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <Label htmlFor="email" required>Email</Label>
 * <Label size="lg" htmlFor="email" required requiredIndicator="(required)">
 *   Email
 * </Label>
 * ```
 */
export interface LabelProps extends RadixLabelProps, LabelVariants {
  /**
   * Override the required indicator content. Defaults to `*`. Rendered with
   * `aria-hidden` so it does not pollute the accessible name; ensure the
   * associated control still exposes its required state to assistive tech.
   */
  requiredIndicator?: React.ReactNode;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  (
    {
      className,
      size,
      required,
      requiredIndicator,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const isRequired = required ?? false;

    return (
      <RadixLabel
        ref={ref}
        data-size={resolvedSize}
        data-required={isRequired
          ? ''
          : undefined}
        className={cn(
          labelVariants({ size: resolvedSize, required: isRequired }),
          className,
        )}
        {...rest}
      >
        {children}
        {isRequired
          ? (
            <span
              aria-hidden
              data-slot="label-required-indicator"
              className={cn(labelRequiredIndicatorVariants({ size: resolvedSize }))}
            >
              {requiredIndicator ?? '*'}
            </span>
          )
          : null}
      </RadixLabel>
    );
  },
);
Label.displayName = 'Label';
