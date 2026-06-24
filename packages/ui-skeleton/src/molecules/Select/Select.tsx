import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import {
  selectChevronVariants,
  selectContentVariants,
  selectItemIndicatorVariants,
  selectItemVariants,
  selectSeparatorVariants,
  selectTriggerVariants,
  selectViewportVariants,
  type SelectTriggerVariants,
} from './select.variants';

type RadixSelectRootProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Root>;
type RadixSelectTriggerProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>;
type RadixSelectContentProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Content>;

/**
 * Single selectable option rendered inside the Select listbox.
 */
export interface SelectItemEntry {
  type: 'item';
  /** Form value committed when this item is selected. Must be unique within the Select. */
  value: string;
  /**
   * Visible label rendered inside `Typography(variant="body")`. When omitted,
   * `value` is used as the label.
   */
  label?: React.ReactNode;
  /**
   * Disable this individual item. The Radix listbox still navigates through
   * it, but selection is blocked and the row is dimmed.
   */
  disabled?: boolean;
  /**
   * Optional typeahead override. By default Radix derives the typeahead
   * string from the item's text content; provide `textValue` when the label
   * contains non-text nodes (icons, badges, etc.).
   */
  textValue?: string;
}

/**
 * Visual divider between groups of items inside the Select listbox.
 */
export interface SelectSeparatorEntry {
  type: 'separator';
}

/**
 * Discriminated union of items rendered inside the Select listbox.
 */
export type SelectItemDescriptor = SelectItemEntry | SelectSeparatorEntry;

/**
 * Select — single-encapsulated wrapper over Radix's Select primitive
 * (`@radix-ui/react-select`). Pairs a wrapper-frame styled trigger (visually
 * aligned with the Input atom) with a portaled listbox of Radix items, each
 * descriptor in `items` rendered as either an interactive `RadixSelect.Item`
 * (label wrapped in `Typography(variant="body")`) or a `RadixSelect.Separator`.
 *
 * @remarks All visual customization flows through `variant`, `size`,
 * `density`, and `tone` — the same axes Input exposes — so a Select dropped
 * next to an Input frames identically. There is no `className` escape hatch.
 * The molecule reuses the `wrapperFrameVariants` particle for the trigger,
 * so any future axis added to the particle propagates here automatically.
 *
 * Supports both controlled (`value` + `onValueChange`) and uncontrolled
 * (`defaultValue`) usage. The portaled Content is anchored to the trigger
 * via the Radix CSS variable `--radix-select-trigger-width`, so the listbox
 * matches the trigger width by default.
 *
 * Pass a custom `trigger` element to opt out of the default wrapper-frame
 * trigger; the molecule wraps it via `<RadixSelect.Trigger asChild>` and the
 * `variant` / `size` / `density` / `tone` axes are then no-ops (the consumer
 * owns the visual treatment).
 *
 * @example
 * ```tsx
 * <Select
 *   placeholder="Pick a fruit"
 *   defaultValue="apple"
 *   items={[
 *     { type: 'item', value: 'apple', label: 'Apple' },
 *     { type: 'item', value: 'banana', label: 'Banana' },
 *     { type: 'separator' },
 *     { type: 'item', value: 'cherry', label: 'Cherry', disabled: true },
 *   ]}
 *   triggerProps={{ 'aria-label': 'Fruit' }}
 * />
 *
 * <Select
 *   size="lg"
 *   tone="subtle"
 *   placeholder="Region"
 *   items={regions.map((r) => ({ type: 'item', value: r.id, label: r.name }))}
 *   onValueChange={setRegion}
 * />
 * ```
 */
export interface SelectProps
  extends Omit<RadixSelectRootProps, 'children'>,
  SelectTriggerVariants {
  /**
   * Items rendered inside the portaled listbox. Discriminated by `type`:
   * `'item'` for selectable rows, `'separator'` for visual dividers. Item
   * `value` strings MUST be unique within the Select — they back the form
   * value and double as React keys.
   */
  items: SelectItemDescriptor[];
  /** Placeholder rendered inside the trigger when no value is selected. */
  placeholder?: React.ReactNode;
  /**
   * Optional override for the entire trigger element. When supplied, the
   * molecule passes it through `<RadixSelect.Trigger asChild>` instead of
   * rendering the default wrapper-frame styled button. The `variant`,
   * `size`, `density`, and `tone` axes are no-ops in this mode — the
   * consumer's element owns the visual treatment.
   */
  trigger?: React.ReactElement;
  /**
   * Pass-through props for the underlying Radix Trigger (`aria-label`,
   * `disabled`, focus handlers, etc.). `className` and `children` are owned
   * by the molecule and excluded.
   */
  triggerProps?: Omit<RadixSelectTriggerProps, 'className' | 'children'>;
  /**
   * Pass-through props for the underlying Radix Content (collision
   * boundary, side offsets, position strategy, `aria-label`, etc.).
   * `className` and `children` are owned by the molecule and excluded.
   */
  contentProps?: Omit<RadixSelectContentProps, 'className' | 'children'>;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      items,
      placeholder,
      trigger,
      triggerProps,
      contentProps,
      variant,
      size,
      density,
      tone,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedDensity = density ?? 'comfortable';
    const resolvedTone = tone ?? 'neutral';

    const triggerElement = trigger !== undefined
      ? (
        <RadixSelect.Trigger ref={ref} asChild {...triggerProps}>
          {trigger}
        </RadixSelect.Trigger>
      )
      : (
        <RadixSelect.Trigger
          ref={ref}
          data-slot="select-trigger"
          data-variant={resolvedVariant}
          data-size={resolvedSize}
          data-density={resolvedDensity}
          data-tone={resolvedTone}
          className={selectTriggerVariants({
            variant: resolvedVariant,
            size: resolvedSize,
            density: resolvedDensity,
            tone: resolvedTone,
          })}
          {...triggerProps}
        >
          <RadixSelect.Value
            data-slot="select-value"
            placeholder={placeholder}
          />
          <RadixSelect.Icon
            data-slot="select-chevron"
            className={cn(selectChevronVariants())}
          >
            <ChevronDown aria-hidden />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
      );

    return (
      <RadixSelect.Root {...rest}>
        {triggerElement}
        <RadixSelect.Portal>
          <RadixSelect.Content
            data-slot="select-content"
            data-size={resolvedSize}
            position="popper"
            sideOffset={4}
            className={cn(selectContentVariants({ size: resolvedSize }))}
            {...contentProps}
          >
            <RadixSelect.Viewport className={cn(selectViewportVariants())}>
              {items.map((item, index) => {
                if (item.type === 'separator') {
                  return (
                    <RadixSelect.Separator
                      key={`separator-${index}`}
                      data-slot="select-separator"
                      className={cn(selectSeparatorVariants())}
                    />
                  );
                }
                return (
                  <RadixSelect.Item
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    textValue={item.textValue}
                    data-slot="select-item"
                    data-size={resolvedSize}
                    className={cn(selectItemVariants({ size: resolvedSize }))}
                  >
                    <RadixSelect.ItemText>
                      <Typography
                        as="span"
                        variant="body"
                        data-slot="select-item-label"
                      >
                        {item.label ?? item.value}
                      </Typography>
                    </RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator
                      data-slot="select-item-indicator"
                      className={cn(selectItemIndicatorVariants())}
                    >
                      <Check aria-hidden />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                );
              })}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    );
  },
);
Select.displayName = 'Select';
