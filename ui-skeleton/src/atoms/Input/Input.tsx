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
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system,
 * and is applied to the visible root frame (a wrapping `<div>`), not the inner
 * `<input>`. All other native input attributes (`name`, `value`,
 * `placeholder`, `disabled`, `aria-*`, etc.) and the forwarded `ref` are
 * applied to the inner `<input>`.
 *
 * When `variant="error"`, the inner input automatically receives
 * `aria-invalid="true"` unless the caller passes `aria-invalid` explicitly.
 *
 * @example
 * ```tsx
 * <Input placeholder="Email" />
 * <Input variant="error" defaultValue="bad@" />
 * <Input size="lg" leadingIcon={<MailIcon />} trailingIcon={<CheckIcon />} />
 * ```
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
  InputVariants {
  /** Optional leading icon node, rendered inside the input frame before the field. */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon node, rendered inside the input frame after the field. */
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
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
    const resolvedAriaInvalid = ariaInvalid ?? (resolvedVariant === 'error'
      ? true
      : undefined);

    return (
      <div
        data-slot="input-root"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          inputVariants({ variant: resolvedVariant, size: resolvedSize }),
          className,
        )}
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
