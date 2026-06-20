import {
  Indicator as RadixRadioGroupIndicator,
  Item as RadixRadioGroupItem,
  Root as RadixRadioGroup,
} from '@radix-ui/react-radio-group';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  radioGroupIndicatorVariants,
  radioGroupItemDescriptionVariants,
  radioGroupItemLabelVariants,
  radioGroupItemRowVariants,
  radioGroupItemVariants,
  radioGroupVariants,
  type RadioGroupOrientationVariants,
  type RadioGroupSizeVariants,
} from './radio-group.variants';

type RadixRadioGroupProps = React.ComponentPropsWithoutRef<typeof RadixRadioGroup>;

/**
 * Descriptor for a single radio item rendered inside a `RadioGroup`.
 */
export interface RadioGroupItemDescriptor {
  /** Form value submitted when this item is selected. Must be unique within the group. */
  value: string;
  /** Optional inline label rendered next to the radio. */
  label?: React.ReactNode;
  /** Optional helper text rendered below the label. */
  description?: React.ReactNode;
  /** Disables this individual item even when the group itself is enabled. */
  disabled?: boolean;
}

/**
 * RadioGroup — single-encapsulated wrapper over Radix's RadioGroup primitive
 * (`@radix-ui/react-radio-group`). Renders one radio per descriptor in `items`,
 * auto-pairing each radio with its label via `React.useId()` + `htmlFor`/`id`.
 *
 * @remarks All visual customization MUST go through `size` and `orientation`.
 * There is no `className` escape hatch. Each item's row uses a native
 * `<label htmlFor={...}>` so that clicks anywhere in the row (label or
 * description) reach the radio button — no extra wiring required.
 *
 * Supports both controlled (`value` + `onValueChange`) and uncontrolled
 * (`defaultValue`) usage. The underlying Radix Root renders a `<div>` with
 * `role="radiogroup"` and the appropriate `aria-orientation` value.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   aria-label="Plan"
 *   defaultValue="pro"
 *   items={[
 *     { value: 'starter', label: 'Starter', description: 'Up to 10 seats' },
 *     { value: 'pro', label: 'Pro', description: 'Up to 100 seats' },
 *     { value: 'legacy', label: 'Legacy', disabled: true },
 *   ]}
 * />
 * ```
 */
export interface RadioGroupProps
  extends Omit<RadixRadioGroupProps, 'children' | 'className' | 'orientation'>,
  RadioGroupSizeVariants,
  RadioGroupOrientationVariants {
  /**
   * Items rendered as individual radios. Each item gets a generated id paired
   * with its label via `htmlFor`. The collection MUST contain unique `value`
   * strings — they back the form value and double as React keys.
   */
  items: RadioGroupItemDescriptor[];
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      items,
      size,
      orientation,
      id,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedOrientation = orientation ?? 'vertical';
    const generatedBaseId = React.useId();
    const baseId = id ?? generatedBaseId;

    return (
      <RadixRadioGroup
        ref={ref}
        orientation={resolvedOrientation}
        data-size={resolvedSize}
        className={cn(radioGroupVariants({ orientation: resolvedOrientation }))}
        {...rest}
      >
        {items.map((item) => {
          const itemId = `${baseId}-${item.value}`;
          const hasLabels = item.label !== undefined || item.description !== undefined;
          const isDisabled = item.disabled === true;
          return (
            <label
              key={item.value}
              htmlFor={itemId}
              data-slot="radio-group-item"
              data-size={resolvedSize}
              data-disabled={isDisabled
                ? ''
                : undefined}
              className={cn(
                radioGroupItemRowVariants({ size: resolvedSize }),
                isDisabled && 'cursor-not-allowed',
              )}
            >
              <RadixRadioGroupItem
                id={itemId}
                value={item.value}
                disabled={item.disabled}
                className={cn(radioGroupItemVariants({ size: resolvedSize }))}
              >
                <RadixRadioGroupIndicator
                  data-slot="radio-group-indicator"
                  className={cn(radioGroupIndicatorVariants({ size: resolvedSize }))}
                />
              </RadixRadioGroupItem>
              {hasLabels
                ? (
                  <span
                    data-slot="radio-group-item-labels"
                    className={cn('flex flex-col gap-1', isDisabled && 'opacity-50')}
                  >
                    {item.label !== undefined
                      ? (
                        <span
                          data-slot="radio-group-item-label"
                          className={cn(radioGroupItemLabelVariants({ size: resolvedSize }))}
                        >
                          {item.label}
                        </span>
                      )
                      : null}
                    {item.description !== undefined
                      ? (
                        <span
                          data-slot="radio-group-item-description"
                          className={cn(radioGroupItemDescriptionVariants({ size: resolvedSize }))}
                        >
                          {item.description}
                        </span>
                      )
                      : null}
                  </span>
                )
                : null}
            </label>
          );
        })}
      </RadixRadioGroup>
    );
  },
);
RadioGroup.displayName = 'RadioGroup';
