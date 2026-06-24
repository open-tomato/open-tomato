import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  collapsibleContentVariants,
  collapsibleVariants,
  type CollapsibleVariants,
} from './collapsible.variants';

type RadixCollapsibleRootProps = React.ComponentPropsWithoutRef<typeof RadixCollapsible.Root>;

/**
 * Collapsible — single-encapsulated wrapper over Radix's Collapsible primitive
 * that pairs a consumer-supplied trigger element with a show/hide content
 * region and (optionally) an auto-injected rotating chevron icon.
 *
 * @remarks All visual customization flows through `size` and `chevron`. There
 * is no `className` escape hatch. The trigger is wrapped internally via
 * `<RadixCollapsible.Trigger asChild>{trigger}</RadixCollapsible.Trigger>` —
 * pass a `Button` atom (or any element that accepts `leadingIcon` /
 * `trailingIcon` when `chevron !== 'none'`) and the molecule clones it to
 * inject a rotating `ChevronDown` icon into the corresponding slot.
 *
 * Open state is tracked internally when uncontrolled so the chevron's rotation
 * can be driven by an own `data-state` attribute on the chevron span. Pass
 * `open` + `onOpenChange` to control the state externally; both are forwarded
 * to the underlying Radix Root.
 *
 * @example
 * ```tsx
 * <Collapsible trigger={<Button variant="ghost">Toggle details</Button>}>
 *   <p>Hidden content revealed when the trigger is clicked.</p>
 * </Collapsible>
 *
 * <Collapsible chevron="leading" size="lg" trigger={<Button>More</Button>}>
 *   <p>Body</p>
 * </Collapsible>
 * ```
 */
export interface CollapsibleProps
  extends Omit<RadixCollapsibleRootProps, 'className' | 'children'>,
  CollapsibleVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Typically
   * a `Button` atom; when `chevron !== 'none'`, the molecule clones it to
   * inject a rotating chevron into the matching `leadingIcon` or
   * `trailingIcon` slot.
   */
  trigger: React.ReactElement<{
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
  }>;
  /** Content rendered inside the collapsible region. */
  children?: React.ReactNode;
}

const chevronSizeForSize = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
} as const;

export const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  (
    {
      size,
      chevron,
      open,
      defaultOpen,
      onOpenChange,
      trigger,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedChevron = chevron ?? 'trailing';

    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled
      ? open
      : uncontrolledOpen;

    const handleOpenChange = React.useCallback(
      (next: boolean) => {
        if (!isControlled) setUncontrolledOpen(next);
        onOpenChange?.(next);
      },
      [isControlled, onOpenChange],
    );

    const chevronNode = resolvedChevron !== 'none'
      ? (
        <span
          aria-hidden
          data-slot="collapsible-chevron"
          data-state={resolvedOpen
            ? 'open'
            : 'closed'}
          className="inline-flex transition-transform duration-150 data-[state=open]:rotate-180"
        >
          <ChevronDown className={chevronSizeForSize[resolvedSize]} />
        </span>
      )
      : null;

    const triggerWithChevron = resolvedChevron === 'none'
      ? trigger
      : React.cloneElement(trigger, {
        leadingIcon: resolvedChevron === 'leading'
          ? chevronNode
          : trigger.props.leadingIcon,
        trailingIcon: resolvedChevron === 'trailing'
          ? chevronNode
          : trigger.props.trailingIcon,
      });

    return (
      <RadixCollapsible.Root
        ref={ref}
        open={resolvedOpen}
        onOpenChange={handleOpenChange}
        data-slot="collapsible-root"
        data-size={resolvedSize}
        data-chevron={resolvedChevron}
        className={cn(collapsibleVariants({
          size: resolvedSize,
          chevron: resolvedChevron,
        }))}
        {...rest}
      >
        <RadixCollapsible.Trigger asChild>{triggerWithChevron}</RadixCollapsible.Trigger>
        <RadixCollapsible.Content
          data-slot="collapsible-content"
          className={cn(collapsibleContentVariants({ size: resolvedSize }))}
        >
          {children}
        </RadixCollapsible.Content>
      </RadixCollapsible.Root>
    );
  },
);
Collapsible.displayName = 'Collapsible';
