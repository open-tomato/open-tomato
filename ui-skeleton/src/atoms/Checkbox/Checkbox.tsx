import {
  Indicator as RadixCheckboxIndicator,
  Root as RadixCheckbox,
} from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  checkboxIconVariants,
  checkboxIndicatorVariants,
  checkboxLabelVariants,
  checkboxRootVariants,
  checkboxVariants,
  type CheckboxVariants,
} from './checkbox.variants';

type RadixCheckboxProps = React.ComponentPropsWithoutRef<typeof RadixCheckbox>;

/**
 * Checkbox — single encapsulated wrapper over Radix Checkbox
 * (root + indicator) with an optional inline label slot.
 *
 * @remarks All visual customization MUST go through the `size` variant.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * When `label` is provided, the wrapper renders the checkbox alongside a
 * `<label>` linked via auto-generated `id` / `htmlFor`. Supports both
 * controlled and uncontrolled usage as well as the `indeterminate` tri-state
 * (rendered with a `Minus` icon instead of `Check`).
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" />
 * <Checkbox size="lg" checked={value} onCheckedChange={setValue} />
 * <Checkbox aria-label="Select all" checked="indeterminate" />
 * ```
 */
export interface CheckboxProps
  extends Omit<RadixCheckboxProps, 'children'>,
  CheckboxVariants {
  /**
   * Optional inline label. When provided, the wrapper renders the checkbox
   * next to a `<label>` linked via `htmlFor`/`id`. Omit and supply
   * `aria-label` / `aria-labelledby` to keep the checkbox accessible without
   * an inline label.
   */
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      size,
      label,
      id,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const generatedId = React.useId();
    const resolvedId = id ?? (label !== undefined
      ? generatedId
      : undefined);

    const checkbox = (
      <RadixCheckbox
        ref={ref}
        id={resolvedId}
        data-size={resolvedSize}
        className={cn(checkboxVariants({ size: resolvedSize }), className)}
        {...rest}
      >
        <RadixCheckboxIndicator className={cn(checkboxIndicatorVariants())}>
          <Check
            aria-hidden
            className={cn(
              checkboxIconVariants({ size: resolvedSize }),
              'group-data-[state=indeterminate]:hidden',
            )}
          />
          <Minus
            aria-hidden
            className={cn(
              checkboxIconVariants({ size: resolvedSize }),
              'hidden group-data-[state=indeterminate]:inline-block',
            )}
          />
        </RadixCheckboxIndicator>
      </RadixCheckbox>
    );

    if (label === undefined) {
      return checkbox;
    }

    return (
      <span
        data-slot="checkbox-root"
        data-size={resolvedSize}
        className={cn(checkboxRootVariants({ size: resolvedSize }))}
      >
        {checkbox}
        <label
          htmlFor={resolvedId}
          data-slot="checkbox-label"
          className={cn(checkboxLabelVariants({ size: resolvedSize }))}
        >
          {label}
        </label>
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';
