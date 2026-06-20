import {
  Root as RadixSwitch,
  Thumb as RadixSwitchThumb,
} from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  switchLabelVariants,
  switchRootVariants,
  switchThumbVariants,
  switchVariants,
  type SwitchVariants,
} from './switch.variants';

type RadixSwitchProps = React.ComponentPropsWithoutRef<typeof RadixSwitch>;

/**
 * Switch — single-encapsulated wrapper over Radix's Switch primitive
 * (`@radix-ui/react-switch`) that folds the Root and Thumb sub-components into
 * one component driven by `size` and `variant`, with an optional inline
 * `label` slot.
 *
 * @remarks All visual customization MUST go through `size` and `variant`. There
 * is no `className` escape hatch. When `label` is provided, the wrapper renders
 * the switch alongside a native `<label>` linked via auto-generated `id` /
 * `htmlFor`. The label uses Tailwind's `peer` + `peer-disabled` pattern to dim
 * automatically when the switch is disabled — clicking the label toggles the
 * switch via the native `<label>` association.
 *
 * Supports both controlled (`checked` + `onCheckedChange`) and uncontrolled
 * (`defaultChecked`) usage. The underlying Radix Root renders a native
 * `<button>` with `role="switch"` and the appropriate `aria-checked` value.
 *
 * @example
 * ```tsx
 * <Switch label="Email notifications" />
 * <Switch size="lg" variant="success" checked={value} onCheckedChange={setValue} />
 * <Switch aria-label="Wi-Fi" />
 * ```
 */
export interface SwitchProps
  extends Omit<RadixSwitchProps, 'children' | 'className'>,
  SwitchVariants {
  /**
   * Optional inline label. When provided, the wrapper renders the switch next
   * to a `<label>` linked via `htmlFor`/`id`. Omit and supply `aria-label` /
   * `aria-labelledby` to keep the switch accessible without an inline label.
   */
  label?: React.ReactNode;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      size,
      variant,
      label,
      id,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedVariant = variant ?? 'default';
    const generatedId = React.useId();
    const resolvedId = id ?? (label !== undefined
      ? generatedId
      : undefined);

    const switchControl = (
      <RadixSwitch
        ref={ref}
        id={resolvedId}
        data-size={resolvedSize}
        data-variant={resolvedVariant}
        className={cn(switchVariants({ size: resolvedSize, variant: resolvedVariant }))}
        {...rest}
      >
        <RadixSwitchThumb
          data-slot="switch-thumb"
          className={cn(switchThumbVariants({ size: resolvedSize }))}
        />
      </RadixSwitch>
    );

    if (label === undefined) {
      return switchControl;
    }

    return (
      <span
        data-slot="switch-root"
        data-size={resolvedSize}
        className={cn(switchRootVariants({ size: resolvedSize }))}
      >
        {switchControl}
        <label
          htmlFor={resolvedId}
          data-slot="switch-label"
          className={cn(switchLabelVariants({ size: resolvedSize }))}
        >
          {label}
        </label>
      </span>
    );
  },
);
Switch.displayName = 'Switch';
