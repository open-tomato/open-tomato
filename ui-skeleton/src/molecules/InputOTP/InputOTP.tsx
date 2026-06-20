import {
  OTPInput,
  OTPInputContext,
  REGEXP_ONLY_DIGITS,
} from 'input-otp';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  inputOtpCaretVariants,
  inputOtpRootVariants,
  inputOtpSlotVariants,
  type InputOtpVariants,
} from './input-otp.variants';

type OTPInputBaseProps = React.ComponentPropsWithoutRef<typeof OTPInput>;

/**
 * InputOTP — one-time-password input that renders N visual slot cells over
 * a single hidden native `<input>` provided by the `input-otp` package. The
 * library handles caret tracking, paste, keyboard navigation, and SMS
 * autofill via the `autoComplete="one-time-code"` channel; the molecule
 * owns the slot rendering and visual axes.
 *
 * @remarks All visual customization MUST go through `length` and `size`.
 * There is no `className` escape hatch. The native `<input>` underneath is
 * pre-configured with `inputMode="numeric"`, `autoComplete="one-time-code"`,
 * and `pattern={REGEXP_ONLY_DIGITS}` so numeric OTP codes work without extra
 * wiring — consumers can override any of the three for alphanumeric codes
 * (`pattern={REGEXP_ONLY_DIGITS_AND_CHARS}`) or to disable the numeric
 * keyboard hint.
 *
 * Supports both controlled (`value` + `onChange(newValue)`) and uncontrolled
 * (`defaultValue`) usage. Setting `invalid` flips slot borders to
 * destructive and emits `aria-invalid="true"` on the hidden input.
 *
 * @example
 * ```tsx
 * <InputOTP aria-label="One-time code" />
 *
 * <InputOTP
 *   length="4"
 *   size="lg"
 *   value={code}
 *   onChange={setCode}
 *   onComplete={submit}
 *   aria-label="PIN"
 * />
 *
 * <InputOTP
 *   length="8"
 *   invalid
 *   pattern="^[a-zA-Z0-9]+$"
 *   aria-label="Recovery code"
 * />
 * ```
 */
export interface InputOTPProps
  extends Omit<
    OTPInputBaseProps,
    | 'maxLength'
    | 'render'
    | 'children'
    | 'className'
    | 'containerClassName'
    | 'size'
  >,
  InputOtpVariants {
  /**
   * Flips slot borders to destructive and sets `aria-invalid="true"` on the
   * hidden input. Pair with a visible error message rendered elsewhere —
   * color alone is insufficient.
   */
  invalid?: boolean;
}

const lengthForVariant = { '4': 4, '6': 6, '8': 8 } as const;

type SlotSize = NonNullable<InputOtpVariants['size']>;

interface InputOtpSlotProps {
  index: number;
  size: SlotSize;
  invalid: boolean;
}

const InputOTPSlot = ({ index, size, invalid }: InputOtpSlotProps): React.ReactElement | null => {
  const context = React.useContext(OTPInputContext);
  const slot = context.slots[index];
  if (slot === undefined) {
    return null;
  }
  const { char, placeholderChar, isActive, hasFakeCaret } = slot;
  return (
    <div
      data-slot="input-otp-slot"
      data-index={index}
      data-size={size}
      data-active={isActive
        ? 'true'
        : undefined}
      data-invalid={invalid
        ? 'true'
        : undefined}
      className={cn(inputOtpSlotVariants({ size, invalid, active: isActive }))}
    >
      {char ?? placeholderChar}
      {hasFakeCaret
        ? (
          <span
            data-slot="input-otp-caret"
            aria-hidden
            className={cn(inputOtpCaretVariants({ size }))}
          >
            <span />
          </span>
        )
        : null}
    </div>
  );
};

export const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  (
    {
      length,
      size,
      invalid,
      inputMode,
      autoComplete,
      pattern,
      'aria-invalid': ariaInvalid,
      ...rest
    },
    ref,
  ) => {
    const resolvedLength = length ?? '6';
    const resolvedSize = size ?? 'md';
    const resolvedInvalid = invalid === true;
    const resolvedAriaInvalid = ariaInvalid ?? (resolvedInvalid
      ? true
      : undefined);
    const slotCount = lengthForVariant[resolvedLength];

    return (
      <div
        data-slot="input-otp-root"
        data-length={resolvedLength}
        data-size={resolvedSize}
        data-invalid={resolvedInvalid
          ? 'true'
          : undefined}
      >
        <OTPInput
          ref={ref}
          maxLength={slotCount}
          inputMode={inputMode ?? 'numeric'}
          autoComplete={autoComplete ?? 'one-time-code'}
          pattern={pattern ?? REGEXP_ONLY_DIGITS}
          aria-invalid={resolvedAriaInvalid}
          data-slot="input-otp-control"
          containerClassName={cn(
            inputOtpRootVariants({ length: resolvedLength, size: resolvedSize }),
          )}
          {...rest}
        >
          {Array.from({ length: slotCount }).map((_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              size={resolvedSize}
              invalid={resolvedInvalid}
            />
          ))}
        </OTPInput>
      </div>
    );
  },
);
InputOTP.displayName = 'InputOTP';
