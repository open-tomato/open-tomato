import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root container for the InputOTP molecule. Wraps the hidden `<input>` and
 * the row of visual slot cells. `length` drives the number of rendered slots
 * (and the inner input's `maxLength`); `size` drives slot dimensions.
 *
 * The `length` axis carries no class output — its only job is to surface the
 * variant in the public API and on `data-length` for tests/consumers. The
 * actual slot count is mapped from `length` via the `lengthForVariant` lookup
 * inside `InputOTP.tsx`.
 *
 * `has-[input:disabled]:` mirrors the disabled treatment that NativeSelect /
 * Input use — when the hidden input is disabled, the whole row dims and the
 * cursor flips to `not-allowed`.
 */
export const inputOtpRootVariants = cva(
  'group inline-flex w-fit items-center has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
  {
    variants: {
      length: { '4': '', '6': '', '8': '' },
      size: { sm: '', md: '', lg: '' },
    },
    defaultVariants: { length: '6', size: 'md' },
  },
);

export type InputOtpVariants = VariantProps<typeof inputOtpRootVariants>;

/**
 * Visual slot cell. The cells render as a single connected group via
 * `border-y border-r` plus `first:border-l first:rounded-l-md last:rounded-r-md`
 * so neighbouring cells share borders without doubling up. `data-active` is
 * driven by input-otp's selection logic (the cell containing the caret).
 *
 * `invalid` is folded in as a cva axis instead of a `data-` selector so the
 * compound variant `{ invalid: true, active: true } → 'ring-destructive'`
 * stays type-safe and the resolved class names are visible in the snapshot.
 */
export const inputOtpSlotVariants = cva(
  'relative flex items-center justify-center font-mono select-none '
  + 'border-y border-r border-input bg-background text-foreground '
  + 'transition-[color,box-shadow] '
  + 'first:rounded-l-md first:border-l last:rounded-r-md',
  {
    variants: {
      size: {
        sm: 'h-8 w-7 text-sm',
        md: 'h-10 w-9 text-base',
        lg: 'h-12 w-11 text-lg',
      },
      invalid: {
        true: 'border-destructive',
        false: '',
      },
      active: {
        true: 'z-10 ring-2 ring-ring ring-offset-1 ring-offset-background',
        false: '',
      },
    },
    compoundVariants: [
      { invalid: true, active: true, class: 'ring-destructive' },
    ],
    defaultVariants: { size: 'md', invalid: false, active: false },
  },
);

/**
 * Static caret bar painted inside the active slot. Renders the inner pipe via
 * an `aria-hidden` span — the real caret is suppressed by input-otp's
 * `caret-color: transparent` on the hidden input.
 */
export const inputOtpCaretVariants = cva(
  'pointer-events-none absolute inset-0 flex items-center justify-center',
  {
    variants: {
      size: {
        sm: '[&>span]:h-4 [&>span]:w-px [&>span]:bg-foreground',
        md: '[&>span]:h-5 [&>span]:w-px [&>span]:bg-foreground',
        lg: '[&>span]:h-6 [&>span]:w-px [&>span]:bg-foreground',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
