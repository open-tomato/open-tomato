import * as React from 'react';

import { inputControlVariants } from '@/atoms/Input';
import { cn } from '@/particles/cn';

import {
  inputGroupAddonVariants,
  inputGroupVariants,
  type InputGroupVariants,
} from './input-group.variants';

/**
 * InputGroup — composition-only organism that frames a single `<input>` plus
 * optional `leading` and `trailing` slot atoms (Button, Kbd, Avatar, etc.)
 * inside a single shared wrapper-frame. The bordered surface, focus ring,
 * height, and horizontal padding are owned by the outer wrapper via the
 * shared `wrapperFrameVariants` particle; the inner control is a native
 * `<input>` styled with the same `inputControlVariants` cva that the
 * `Input` atom uses for its internal control.
 *
 * @remarks All visual customization flows through `size` and `invalid`. There
 * is no `className` escape hatch. The `invalid` axis maps to the
 * wrapper-frame `variant` axis (`true` → `'error'`, `false` → `'default'`)
 * via the `variantForInvalid` lookup table in `input-group.variants.ts`;
 * the same axis also flips the native input's `aria-invalid` to `'true'`
 * unless the consumer overrides it explicitly.
 *
 * InputGroup is structurally analogous to the Input atom: both consume the
 * `wrapperFrameVariants` particle for the outer frame and the
 * `inputControlVariants` cva for the inner native control. The difference
 * is that InputGroup adds slot atoms on either side of the control under
 * the same shared border — the focus-within ring on the wrapper-frame
 * fires for both the inner input AND an actionable slot atom, producing a
 * single shared focus indicator for the whole group.
 *
 * @example
 * ```tsx
 * <InputGroup
 *   aria-label="Search"
 *   leading={<Kbd size="sm">⌘</Kbd>}
 *   placeholder="Search…"
 * />
 *
 * <InputGroup
 *   size="lg"
 *   aria-label="Coupon code"
 *   trailing={<Button size="sm" variant="ghost">Apply</Button>}
 *   placeholder="Coupon code"
 * />
 *
 * <InputGroup
 *   invalid
 *   aria-label="Email"
 *   leading={<span aria-hidden>@</span>}
 *   defaultValue="invalid@"
 * />
 * ```
 */
export interface InputGroupProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'className'
  >,
  InputGroupVariants {
  /**
   * Leading slot rendered before the input control inside the shared frame.
   * Typically a `Kbd` (keyboard shortcut hint), `Avatar` (account
   * indicator), or `Badge` atom. Rendered raw inside a `<span>` slot
   * wrapper — the organism does not inject styling into the node.
   */
  leading?: React.ReactNode;
  /**
   * Trailing slot rendered after the input control inside the shared frame.
   * Typically a `Button` (apply / submit / clear action) or `Kbd`. Rendered
   * raw inside a `<span>` slot wrapper.
   */
  trailing?: React.ReactNode;
}

export const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  (
    {
      leading,
      trailing,
      size,
      invalid,
      type,
      'aria-invalid': ariaInvalid,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedInvalid = invalid ?? false;
    const resolvedAriaInvalid = ariaInvalid ?? (resolvedInvalid
      ? true
      : undefined);

    const hasLeading = leading !== undefined && leading !== null;
    const hasTrailing = trailing !== undefined && trailing !== null;

    return (
      <div
        data-slot="input-group-root"
        data-size={resolvedSize}
        data-invalid={resolvedInvalid
          ? ''
          : undefined}
        className={cn(inputGroupVariants({
          size: resolvedSize,
          invalid: resolvedInvalid,
        }))}
      >
        {hasLeading
          ? (
            <span
              data-slot="input-group-leading"
              className={cn(inputGroupAddonVariants({ size: resolvedSize }))}
            >
              {leading}
            </span>
          )
          : null}
        <input
          ref={ref}
          type={type ?? 'text'}
          data-slot="input-group-control"
          aria-invalid={resolvedAriaInvalid}
          className={cn(inputControlVariants())}
          {...rest}
        />
        {hasTrailing
          ? (
            <span
              data-slot="input-group-trailing"
              className={cn(inputGroupAddonVariants({ size: resolvedSize }))}
            >
              {trailing}
            </span>
          )
          : null}
      </div>
    );
  },
);
InputGroup.displayName = 'InputGroup';
