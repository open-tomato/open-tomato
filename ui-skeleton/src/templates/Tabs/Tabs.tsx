import * as RadixTabs from '@radix-ui/react-tabs';
import * as React from 'react';

import { Button } from '@/atoms/Button';
import { cn } from '@/particles/cn';

import {
  tabsContentVariants,
  tabsListVariants,
  tabsVariants,
  type TabsVariants,
} from './tabs.variants';

type SharedRadixProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixTabs.Root>,
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'orientation'
  | 'className'
  | 'children'
  | 'dir'
  | 'asChild'
>;

/**
 * Descriptor for a single tabs entry. The descriptor is the canonical
 * data-driven shape documented in the template-authoring skill: each entry
 * owns a stable `value` (React key + Radix selection identifier), a
 * `trigger` ReactNode rendered inside the composed `Button` atom, and a
 * `content` ReactNode rendered inside the matching panel.
 */
export interface TabsItemEntry {
  /** Stable value used as React key, Radix selection identifier, and panel link. */
  value: string;
  /** Trigger content rendered inside the composed `Button` atom. */
  trigger: React.ReactNode;
  /** Content rendered inside the corresponding `<RadixTabs.Content>` panel. */
  content: React.ReactNode;
  /** Disables this individual trigger; Radix blocks selection and focus. */
  disabled?: boolean;
}

/**
 * Tabs — canonical template wrapping `@radix-ui/react-tabs` and composing
 * the `Button` atom for triggers + raw `<RadixTabs.Content>` for content
 * panels.
 *
 * @remarks All visual customization flows through `orientation`, `size`, and
 * `density`. There is no `className` escape hatch. The `size` axis maps to
 * the composed `Button` atom's `size` axis via a lookup table; the
 * `density` axis tunes the trigger-rail padding without changing the
 * Button atom's size. Active triggers map to `Button.variant='secondary'`
 * and inactive triggers to `Button.variant='ghost'` (the lookup table is
 * keyed on the resolved active state derived from Radix's data-state
 * attribute via a controlled-passthrough state pattern).
 *
 * Internal `useState` implements the controlled-passthrough pattern: when
 * the consumer passes `value`, the template delegates to that controlled
 * flow and never flips its own state. When uncontrolled (`defaultValue`
 * only), the template owns the active-tab state so per-trigger variant
 * propagation can be driven from a known active value. `data-state` and
 * `data-orientation` are reflected on the rendered root.
 *
 * @example
 * ```tsx
 * <Tabs
 *   defaultValue="overview"
 *   items={[
 *     { value: 'overview', trigger: 'Overview', content: <p>Overview body</p> },
 *     { value: 'details', trigger: 'Details', content: <p>Details body</p> },
 *   ]}
 * />
 *
 * <Tabs
 *   orientation="vertical"
 *   size="lg"
 *   value={active}
 *   onValueChange={setActive}
 *   items={items}
 * />
 * ```
 */
export interface TabsProps extends SharedRadixProps, TabsVariants {
  /** Items rendered as triggers (composed `Button` atom) and matched panels. */
  items: TabsItemEntry[];
  /** Controlled active value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial active value. */
  defaultValue?: string;
  /** Fires when the active tab changes. */
  onValueChange?: (value: string) => void;
  /** Optional `aria-label` for the underlying `<RadixTabs.List>`. */
  'aria-label'?: string;
}

const buttonSizeForSize = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const;

const buttonVariantForActive = {
  active: 'secondary',
  inactive: 'ghost',
} as const;

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      value,
      defaultValue,
      onValueChange,
      orientation,
      size,
      density,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const resolvedOrientation = orientation ?? 'horizontal';
    const resolvedSize = size ?? 'md';
    const resolvedDensity = density ?? 'comfortable';

    const initialUncontrolled = defaultValue
      ?? (items[0]?.value ?? '');

    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(initialUncontrolled);
    const isControlled = value !== undefined;
    const resolvedValue = isControlled
      ? value
      : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolledValue(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    const rootState = resolvedValue
      ? 'active'
      : 'inactive';

    return (
      <RadixTabs.Root
        ref={ref}
        value={resolvedValue}
        onValueChange={handleValueChange}
        orientation={resolvedOrientation}
        data-slot="tabs-root"
        data-size={resolvedSize}
        data-orientation={resolvedOrientation}
        data-density={resolvedDensity}
        data-state={rootState}
        className={cn(tabsVariants({
          orientation: resolvedOrientation,
          size: resolvedSize,
          density: resolvedDensity,
        }))}
        {...rest}
      >
        <RadixTabs.List
          aria-label={ariaLabel}
          data-slot="tabs-list"
          className={cn(tabsListVariants({
            orientation: resolvedOrientation,
            size: resolvedSize,
            density: resolvedDensity,
          }))}
        >
          {items.map((item) => {
            const isActive = item.value === resolvedValue;
            const activeKey = isActive
              ? 'active'
              : 'inactive';

            return (
              <RadixTabs.Trigger
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                asChild
                data-slot="tabs-trigger"
              >
                <Button
                  size={buttonSizeForSize[resolvedSize]}
                  variant={buttonVariantForActive[activeKey]}
                  disabled={item.disabled}
                >
                  {item.trigger}
                </Button>
              </RadixTabs.Trigger>
            );
          })}
        </RadixTabs.List>
        {items.map((item) => (
          <RadixTabs.Content
            key={item.value}
            value={item.value}
            data-slot="tabs-content"
            className={cn(tabsContentVariants({
              orientation: resolvedOrientation,
              size: resolvedSize,
              density: resolvedDensity,
            }))}
          >
            {item.content}
          </RadixTabs.Content>
        ))}
      </RadixTabs.Root>
    );
  },
);
Tabs.displayName = 'Tabs';

export { Tabs };
