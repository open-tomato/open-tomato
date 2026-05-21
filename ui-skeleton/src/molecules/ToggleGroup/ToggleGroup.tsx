import {
  Item as RadixToggleGroupItem,
  Root as RadixToggleGroup,
} from '@radix-ui/react-toggle-group';
import * as React from 'react';

import { Toggle, type ToggleProps } from '@/atoms/Toggle';
import { cn } from '@/particles/cn';

import {
  toggleGroupVariants,
  type ToggleGroupVariants,
} from './toggle-group.variants';

type RadixToggleGroupRootProps = React.ComponentPropsWithoutRef<typeof RadixToggleGroup>;

type SharedRadixProps = Omit<
  RadixToggleGroupRootProps,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'children'
  | 'className'
  | 'orientation'
>;

/**
 * Descriptor for a single toggle rendered inside a `ToggleGroup`.
 */
export interface ToggleGroupItemDescriptor {
  /** Form value associated with this toggle. Must be unique within the group. */
  value: string;
  /** Inline content rendered inside the underlying Toggle atom. */
  label: React.ReactNode;
  /**
   * Accessible name for icon-only toggles. Forwarded to the underlying Toggle
   * atom as `aria-label`.
   */
  ariaLabel?: string;
  /** Disables this individual toggle even when the group itself is enabled. */
  disabled?: boolean;
}

interface ToggleGroupBaseProps extends SharedRadixProps, ToggleGroupVariants {
  /**
   * Items rendered as individual toggles. Each descriptor is wrapped in a
   * Radix `ToggleGroup.Item` using `asChild` so that the Toggle atom is the
   * actual rendered element — preserving variant and size propagation.
   */
  items: ToggleGroupItemDescriptor[];
  /** Forwarded to every composed Toggle atom; consumer-overridable per-item. */
  variant?: ToggleProps['variant'];
  /** Forwarded to every composed Toggle atom; consumer-overridable per-item. */
  size?: ToggleProps['size'];
}

export interface ToggleGroupSingleProps extends ToggleGroupBaseProps {
  /** Single-selection mode — `value` is a string. */
  type: 'single';
  /** Controlled current value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fires when the selection changes (single-mode). */
  onValueChange?: (value: string) => void;
}

export interface ToggleGroupMultipleProps extends ToggleGroupBaseProps {
  /** Multiple-selection mode — `value` is an array of strings. */
  type: 'multiple';
  /** Controlled current values. Pair with `onValueChange`. */
  value?: string[];
  /** Uncontrolled initial values. */
  defaultValue?: string[];
  /** Fires when the selection changes (multiple-mode). */
  onValueChange?: (value: string[]) => void;
}

/**
 * ToggleGroup — single-encapsulated wrapper over Radix's ToggleGroup primitive
 * (`@radix-ui/react-toggle-group`). Each descriptor in `items` is rendered as a
 * `<RadixToggleGroup.Item asChild>` wrapping the project's Toggle atom — so the
 * Toggle's `variant` and `size` axes drive per-item appearance and the
 * `data-state="on" | "off"` toggle behavior is preserved end to end.
 *
 * @remarks All visual customization MUST go through `variant`, `size`, and
 * `orientation`. There is no `className` escape hatch and no `className` is
 * forwarded to the composed Toggle children. The `type` discriminator selects
 * between single-selection (`value: string`) and multi-selection
 * (`value: string[]`) behavior — TypeScript narrows `value`/`defaultValue`/
 * `onValueChange` automatically based on the chosen `type`.
 *
 * @example
 * ```tsx
 * <ToggleGroup
 *   type="single"
 *   aria-label="Text alignment"
 *   defaultValue="left"
 *   items={[
 *     { value: 'left', label: 'Left', ariaLabel: 'Align left' },
 *     { value: 'center', label: 'Center', ariaLabel: 'Align center' },
 *     { value: 'right', label: 'Right', ariaLabel: 'Align right' },
 *   ]}
 * />
 *
 * <ToggleGroup
 *   type="multiple"
 *   aria-label="Text style"
 *   variant="outline"
 *   size="sm"
 *   items={[
 *     { value: 'bold', label: 'B', ariaLabel: 'Bold' },
 *     { value: 'italic', label: 'I', ariaLabel: 'Italic' },
 *     { value: 'underline', label: 'U', ariaLabel: 'Underline' },
 *   ]}
 * />
 * ```
 */
export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (props, ref) => {
    const resolvedVariant = props.variant ?? 'default';
    const resolvedSize = props.size ?? 'md';
    const resolvedOrientation = props.orientation ?? 'horizontal';

    const itemElements = props.items.map((item) => (
      <RadixToggleGroupItem
        key={item.value}
        value={item.value}
        disabled={item.disabled}
        asChild
      >
        <Toggle
          variant={resolvedVariant}
          size={resolvedSize}
          aria-label={item.ariaLabel}
        >
          {item.label}
        </Toggle>
      </RadixToggleGroupItem>
    ));

    if (props.type === 'multiple') {
      const {
        items: _items,
        variant: _variant,
        size: _size,
        orientation: _orientation,
        type: _type,
        ...rest
      } = props;
      return (
        <RadixToggleGroup
          ref={ref}
          type="multiple"
          orientation={resolvedOrientation}
          data-slot="toggle-group"
          data-variant={resolvedVariant}
          data-size={resolvedSize}
          className={cn(toggleGroupVariants({ orientation: resolvedOrientation }))}
          {...rest}
        >
          {itemElements}
        </RadixToggleGroup>
      );
    }

    const {
      items: _items,
      variant: _variant,
      size: _size,
      orientation: _orientation,
      type: _type,
      ...rest
    } = props;
    return (
      <RadixToggleGroup
        ref={ref}
        type="single"
        orientation={resolvedOrientation}
        data-slot="toggle-group"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(toggleGroupVariants({ orientation: resolvedOrientation }))}
        {...rest}
      >
        {itemElements}
      </RadixToggleGroup>
    );
  },
);
ToggleGroup.displayName = 'ToggleGroup';
