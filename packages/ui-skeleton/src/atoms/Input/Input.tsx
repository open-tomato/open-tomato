import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  inputControlVariants,
  inputIconVariants,
  inputVariants,
  type InputVariants,
} from './input.variants';

/**
 * Input — single encapsulated wrapper that frames a native `<input>` with
 * optional `leadingIcon` / `trailingIcon` slots.
 *
 * @remarks All visual customization MUST go through the variant axes
 * (`variant`, `size`, `density`, `tone`). All native input attributes
 * (`name`, `value`, `placeholder`, `disabled`, `aria-*`, etc.) and the
 * forwarded `ref` are applied to the inner `<input>`.
 *
 * When `variant="error"`, the inner input automatically receives
 * `aria-invalid="true"` unless the caller passes `aria-invalid` explicitly.
 *
 * @example
 * ```tsx
 * <Input placeholder="Email" />
 * <Input variant="error" defaultValue="bad@" />
 * <Input size="lg" leadingIcon={<MailIcon />} trailingIcon={<CheckIcon />} />
 * <Input density="compact" tone="subtle" placeholder="Filter" />
 * ```
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'>,
  InputVariants {
  /** Optional leading icon node, rendered inside the input frame before the field. */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon node, rendered inside the input frame after the field. */
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant,
      size,
      density,
      tone,
      leadingIcon,
      trailingIcon,
      type,
      'aria-invalid': ariaInvalid,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedDensity = density ?? 'comfortable';
    const resolvedTone = tone ?? 'neutral';
    const resolvedAriaInvalid = ariaInvalid ?? (resolvedVariant === 'error'
      ? true
      : undefined);

    return (
      <div
        data-slot="input-root"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-density={resolvedDensity}
        data-tone={resolvedTone}
        className={cn(inputVariants({
          variant: resolvedVariant,
          size: resolvedSize,
          density: resolvedDensity,
          tone: resolvedTone,
        }))}
      >
        {leadingIcon !== undefined
          ? (
            <span
              data-slot="input-leading-icon"
              aria-hidden
              className={cn(inputIconVariants({ size: resolvedSize }))}
            >
              {leadingIcon}
            </span>
          )
          : null}
        <input
          ref={ref}
          type={type ?? 'text'}
          data-slot="input-control"
          aria-invalid={resolvedAriaInvalid}
          className={cn(inputControlVariants())}
          {...rest}
        />
        {trailingIcon !== undefined
          ? (
            <span
              data-slot="input-trailing-icon"
              aria-hidden
              className={cn(inputIconVariants({ size: resolvedSize }))}
            >
              {trailingIcon}
            </span>
          )
          : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
