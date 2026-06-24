import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  nativeSelectChevronVariants,
  nativeSelectControlVariants,
  nativeSelectIconVariants,
  nativeSelectVariants,
  type NativeSelectVariants,
} from './native-select.variants';

/**
 * Single selectable option rendered inside the native `<select>` via the
 * data-driven `options` prop.
 */
export interface NativeSelectOptionEntry {
  type: 'option';
  /** Native option value. Form-submitted when the option is selected. */
  value: string;
  /** Visible label. When omitted, `value` is rendered as the label. */
  label?: React.ReactNode;
  /** Disable this individual option. */
  disabled?: boolean;
}

/**
 * Visual grouping of options rendered through `<optgroup>`.
 */
export interface NativeSelectGroupEntry {
  type: 'group';
  /** Group label rendered via `<optgroup label>`. */
  label: string;
  /** Options inside the group. */
  options: NativeSelectOptionEntry[];
}

/**
 * Discriminated union of entries rendered inside the native `<select>`.
 */
export type NativeSelectOptionDescriptor = NativeSelectOptionEntry | NativeSelectGroupEntry;

/**
 * NativeSelect — wraps a native `<select>` with a wrapper-frame styled
 * surface visually aligned with Input, Textarea, and Select. The OS-default
 * chevron is hidden via `appearance-none`, and a decorative chevron icon is
 * rendered as a sibling of the select so the dropdown affordance stays
 * consistent with the design system's other input-shaped surfaces.
 *
 * @remarks Reach for NativeSelect (over the Radix-based Select molecule)
 * when the product needs the platform-native dropdown (mobile, kiosk,
 * accessibility profiles that depend on system widgets), when the value
 * space is short and closed, or when form-control semantics must mirror
 * `<input>` / `<textarea>` exactly. All visual customization flows through
 * the same axes Input exposes (`variant`, `size`, `density`, `tone`) — there
 * is no `className` escape hatch.
 *
 * When `variant="error"`, the inner select automatically receives
 * `aria-invalid="true"` unless the caller passes `aria-invalid` explicitly.
 *
 * @example
 * ```tsx
 * <NativeSelect
 *   aria-label="Fruit"
 *   placeholder="Pick a fruit"
 *   defaultValue=""
 *   options={[
 *     { type: 'option', value: 'apple', label: 'Apple' },
 *     { type: 'option', value: 'banana', label: 'Banana' },
 *   ]}
 * />
 *
 * <NativeSelect aria-label="Region" leadingIcon={<GlobeIcon />} variant="error">
 *   <option value="" disabled hidden>Pick a region</option>
 *   <option value="emea">EMEA</option>
 *   <option value="amer">Americas</option>
 * </NativeSelect>
 * ```
 */
export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'className'>,
  NativeSelectVariants {
  /** Optional leading icon node rendered inside the frame before the select. */
  leadingIcon?: React.ReactNode;
  /**
   * Data-driven option list. Mutually exclusive with `children`. When
   * provided, the molecule renders `<option>` / `<optgroup>` elements
   * internally; otherwise it falls back to whatever `children` the consumer
   * passes (typically raw `<option>` nodes).
   */
  options?: NativeSelectOptionDescriptor[];
  /**
   * Placeholder rendered as a disabled, hidden first `<option>` with an
   * empty value. Pair with `defaultValue=""` (uncontrolled) or `value=""`
   * (controlled) so the placeholder renders selected on initial mount.
   */
  placeholder?: React.ReactNode;
}

const renderOption = (option: NativeSelectOptionEntry): React.ReactNode => (
  <option key={option.value} value={option.value} disabled={option.disabled}>
    {option.label ?? option.value}
  </option>
);

const renderDescriptor = (
  descriptor: NativeSelectOptionDescriptor,
  index: number,
): React.ReactNode => {
  if (descriptor.type === 'group') {
    return (
      <optgroup key={`${descriptor.label}-${index}`} label={descriptor.label}>
        {descriptor.options.map(renderOption)}
      </optgroup>
    );
  }
  return renderOption(descriptor);
};

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      variant,
      size,
      density,
      tone,
      leadingIcon,
      options,
      placeholder,
      children,
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
        data-slot="native-select-root"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-density={resolvedDensity}
        data-tone={resolvedTone}
        className={cn(nativeSelectVariants({
          variant: resolvedVariant,
          size: resolvedSize,
          density: resolvedDensity,
          tone: resolvedTone,
        }))}
      >
        {leadingIcon !== undefined
          ? (
            <span
              data-slot="native-select-leading-icon"
              aria-hidden
              className={cn(nativeSelectIconVariants({ size: resolvedSize }))}
            >
              {leadingIcon}
            </span>
          )
          : null}
        <select
          ref={ref}
          data-slot="native-select-control"
          aria-invalid={resolvedAriaInvalid}
          className={cn(nativeSelectControlVariants())}
          {...rest}
        >
          {placeholder !== undefined
            ? (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )
            : null}
          {options !== undefined
            ? options.map(renderDescriptor)
            : children}
        </select>
        <span
          data-slot="native-select-chevron"
          aria-hidden
          className={cn(nativeSelectChevronVariants())}
        >
          <ChevronDown />
        </span>
      </div>
    );
  },
);
NativeSelect.displayName = 'NativeSelect';
