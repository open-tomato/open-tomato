import * as React from 'react';

import { Input } from '@/atoms/Input';
import { Label } from '@/atoms/Label';
import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import {
  fieldMessageVariants,
  fieldVariants,
  type FieldVariants,
} from './field.variants';

/**
 * Field — composition-only organism that frames a single form control by
 * composing the `Label` and `Input` atoms with optional description / error
 * messages rendered through the `Typography` atom. Generates the
 * `id` / `htmlFor` / `aria-describedby` wiring automatically via
 * `React.useId()`; a consumer-supplied `id` prop overrides the auto-generated
 * base.
 *
 * @remarks All visual customization flows through `size` and `invalid`. There
 * is no `className` escape hatch. The `size` axis is propagated to both the
 * Label atom's `size` and the Input atom's `size` via the
 * `labelSizeForSize` / `inputSizeForSize` lookup tables. The `invalid` axis
 * maps to the Input atom's `variant="error"` via the `inputVariantForInvalid`
 * lookup, which also flips the inner native `<input>`'s `aria-invalid`
 * automatically (see Input's `resolvedAriaInvalid`).
 *
 * The `description` and `error` slots are both wired into the input's
 * `aria-describedby`: a consumer-supplied `aria-describedby` is preserved and
 * the auto-generated description / error IDs are appended. The `error` slot
 * additionally renders inside a wrapper styled via
 * `fieldMessageVariants({ tone: 'destructive' })`, which uses a descendant
 * selector to tint the inner Typography to the destructive token.
 *
 * The wrapping `<div data-slot="field-root">` is the layout container; the
 * forwarded `ref` lands on the inner native `<input>` so consumers can
 * `useRef<HTMLInputElement>` for focus / measurement / form integration.
 *
 * @example
 * ```tsx
 * <Field
 *   label="Email"
 *   description="We'll never share your email."
 *   placeholder="you@example.com"
 *   required
 * />
 *
 * <Field
 *   id="username"
 *   label="Username"
 *   leading={<AtSign aria-hidden />}
 *   invalid
 *   error="That username is taken."
 *   defaultValue="taken"
 * />
 *
 * <Field
 *   size="lg"
 *   label="Search"
 *   trailing={<Search aria-hidden />}
 *   placeholder="Type to search…"
 * />
 * ```
 */
export interface FieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'className'
  >,
  FieldVariants {
  /**
   * Override the auto-generated base id used to pair the Label's `htmlFor`
   * with the Input's `id`. When omitted, a stable id is generated via
   * `React.useId()` on mount; description / error message ids are derived as
   * `<base>-description` and `<base>-error`.
   */
  id?: string;
  /** Label content rendered above the input via the Label atom. */
  label?: React.ReactNode;
  /**
   * Helper text rendered below the input via Typography `variant="caption"`.
   * When present, the wrapper's stable id is appended to the input's
   * `aria-describedby`.
   */
  description?: React.ReactNode;
  /**
   * Error message rendered below the input via Typography `variant="caption"`
   * with the destructive tone applied. When present, the wrapper's stable id
   * is appended to the input's `aria-describedby`. Set `invalid` to also
   * propagate the error state to the input frame (border + `aria-invalid`).
   */
  error?: React.ReactNode;
  /** Optional leading icon rendered inside the Input frame before the field. */
  leading?: React.ReactNode;
  /** Optional trailing icon rendered inside the Input frame after the field. */
  trailing?: React.ReactNode;
}

const labelSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const inputVariantForInvalid = {
  true: 'error',
  false: 'default',
} as const;

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  (
    {
      id,
      label,
      description,
      error,
      leading,
      trailing,
      size,
      invalid,
      required,
      'aria-describedby': consumerDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedInvalid = invalid ?? false;
    const autoId = React.useId();
    const resolvedId = id ?? autoId;

    const hasDescription = description !== undefined && description !== null;
    const hasError = error !== undefined && error !== null;

    const descriptionId = hasDescription
      ? `${resolvedId}-description`
      : undefined;
    const errorId = hasError
      ? `${resolvedId}-error`
      : undefined;

    const describedByIds = [
      consumerDescribedBy,
      descriptionId,
      errorId,
    ].filter((value): value is string => Boolean(value));
    const resolvedDescribedBy = describedByIds.length > 0
      ? describedByIds.join(' ')
      : undefined;

    return (
      <div
        data-slot="field-root"
        data-size={resolvedSize}
        data-invalid={resolvedInvalid
          ? ''
          : undefined}
        className={cn(fieldVariants({
          size: resolvedSize,
          invalid: resolvedInvalid,
        }))}
      >
        {label !== undefined && label !== null
          ? (
            <Label
              htmlFor={resolvedId}
              size={labelSizeForSize[resolvedSize]}
              required={required}
              data-slot="field-label"
            >
              {label}
            </Label>
          )
          : null}
        <Input
          ref={ref}
          id={resolvedId}
          size={inputSizeForSize[resolvedSize]}
          variant={inputVariantForInvalid[resolvedInvalid
            ? 'true'
            : 'false']}
          leadingIcon={leading}
          trailingIcon={trailing}
          required={required}
          aria-describedby={resolvedDescribedBy}
          {...rest}
        />
        {hasDescription
          ? (
            <span
              id={descriptionId}
              data-slot="field-description"
              className={cn(fieldMessageVariants({ tone: 'neutral' }))}
            >
              <Typography variant="caption">{description}</Typography>
            </span>
          )
          : null}
        {hasError
          ? (
            <span
              id={errorId}
              data-slot="field-error"
              className={cn(fieldMessageVariants({ tone: 'destructive' }))}
            >
              <Typography variant="caption">{error}</Typography>
            </span>
          )
          : null}
      </div>
    );
  },
);
Field.displayName = 'Field';
