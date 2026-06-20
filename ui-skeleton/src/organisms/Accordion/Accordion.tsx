import * as RadixAccordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { collapsibleContentVariants } from '@/molecules/Collapsible';
import { cn } from '@/particles/cn';

import {
  accordionContentSpacingVariants,
  accordionItemVariants,
  accordionTriggerVariants,
  accordionVariants,
  type AccordionVariants,
} from './accordion.variants';

type SharedRadixProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Root>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'children'
  | 'className'
  | 'orientation'
  | 'asChild'
>;

/**
 * Descriptor for a single accordion entry. The discriminated `type: 'item'`
 * tag mirrors the items[] pattern documented in the organism-authoring skill.
 * `value` doubles as the React key, the Radix selection identifier, and the
 * form value — collisions break selection.
 */
export interface AccordionItemEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'item';
  /** Stable value used as React key and Radix selection identifier. */
  value: string;
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must
   * accept `leadingIcon` / `trailingIcon` (typically a `Button` atom) so the
   * organism can clone it to inject a rotating chevron into the matching
   * slot.
   */
  trigger: React.ReactElement<{
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
  }>;
  /** Content rendered inside the item's expanding region. */
  content: React.ReactNode;
  /** Disables this individual item; the trigger stays interactive-blocked. */
  disabled?: boolean;
}

interface AccordionBaseProps extends SharedRadixProps, AccordionVariants {
  /** Items rendered as individual accordion entries. */
  items: AccordionItemEntry[];
  /**
   * Chevron position relative to the trigger label. `'none'` skips the
   * auto-injected chevron entirely (use when the trigger already conveys
   * open/closed state).
   */
  chevron?: 'leading' | 'trailing' | 'none';
}

export interface AccordionSingleProps extends AccordionBaseProps {
  /** Single-open mode — at most one item open at a time. */
  type: 'single';
  /** Controlled current value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fires when the open item changes. */
  onValueChange?: (value: string) => void;
  /**
   * Allows the open item to be collapsed by clicking its trigger again.
   * Defaults to `true` for the organism (Radix defaults to `false`).
   */
  collapsible?: boolean;
}

export interface AccordionMultipleProps extends AccordionBaseProps {
  /** Multi-open mode — any number of items may be open simultaneously. */
  type: 'multiple';
  /** Controlled current values. Pair with `onValueChange`. */
  value?: string[];
  /** Uncontrolled initial values. */
  defaultValue?: string[];
  /** Fires when the open items change. */
  onValueChange?: (value: string[]) => void;
}

/**
 * Accordion — canonical organism composing the Collapsible molecule's
 * content-styling variants and wrapping `@radix-ui/react-accordion` for
 * multi-item open/close coordination.
 *
 * @remarks All visual customization flows through `size`, `orientation`, and
 * `chevron`. There is no `className` escape hatch. The discriminated `type`
 * prop narrows `value` / `defaultValue` / `onValueChange` between single-open
 * (`string`) and multi-open (`string[]`) shapes — the same pattern as the
 * ToggleGroup molecule.
 *
 * Each items[] descriptor is rendered as a `<RadixAccordion.Item>` containing
 * a `<RadixAccordion.Trigger asChild>` that wraps the consumer-supplied
 * `trigger` element. The trigger is cloned via `React.cloneElement` to inject
 * a rotating `ChevronDown` icon into its `leadingIcon` / `trailingIcon` slot,
 * mirroring the chevron-injection pattern of the Collapsible molecule. The
 * per-item chevron span carries its own `data-state="open" | "closed"`
 * attribute driven by the resolved value, so Tailwind's
 * `data-[state=open]:rotate-180` selector rotates the icon.
 *
 * @example
 * ```tsx
 * <Accordion
 *   type="single"
 *   defaultValue="overview"
 *   collapsible
 *   items={[
 *     { type: 'item', value: 'overview', trigger: <Button>Overview</Button>,
 *       content: <p>Summary content.</p> },
 *     { type: 'item', value: 'details', trigger: <Button>Details</Button>,
 *       content: <p>Detailed body.</p> },
 *   ]}
 * />
 *
 * <Accordion
 *   type="multiple"
 *   defaultValue={['a', 'b']}
 *   items={[
 *     { type: 'item', value: 'a', trigger: <Button>A</Button>, content: 'a' },
 *     { type: 'item', value: 'b', trigger: <Button>B</Button>, content: 'b' },
 *   ]}
 * />
 * ```
 */
export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

const chevronSizeForSize = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
} as const;

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (props, ref) => {
    const resolvedSize = props.size ?? 'md';
    const resolvedOrientation = props.orientation ?? 'vertical';
    const resolvedChevron = props.chevron ?? 'trailing';

    const isMultiple = props.type === 'multiple';
    const initialUncontrolled = isMultiple
      ? (props.defaultValue ?? [])
      : (props.defaultValue ?? '');

    const [uncontrolledValue, setUncontrolledValue] = React.useState<
      string | string[]
    >(initialUncontrolled);
    const isControlled = props.value !== undefined;
    const resolvedValue = isControlled
      ? props.value
      : uncontrolledValue;

    const isItemOpen = (itemValue: string): boolean => {
      if (isMultiple) {
        return Array.isArray(resolvedValue) && resolvedValue.includes(itemValue);
      }
      return resolvedValue === itemValue;
    };

    const openCount = isMultiple
      ? (Array.isArray(resolvedValue)
        ? resolvedValue.length
        : 0)
      : ((typeof resolvedValue === 'string' && resolvedValue.length > 0)
        ? 1
        : 0);
    const rootState = openCount > 0
      ? 'open'
      : 'closed';

    const renderItems = props.items.map((item) => {
      const itemOpen = isItemOpen(item.value);
      const chevronNode = resolvedChevron === 'none'
        ? null
        : (
          <span
            aria-hidden
            data-slot="accordion-chevron"
            data-state={itemOpen
              ? 'open'
              : 'closed'}
            className="inline-flex shrink-0 transition-transform duration-150 data-[state=open]:rotate-180"
          >
            <ChevronDown className={chevronSizeForSize[resolvedSize]} />
          </span>
        );

      const triggerWithChevron = resolvedChevron === 'none'
        ? item.trigger
        : React.cloneElement(item.trigger, {
          leadingIcon: resolvedChevron === 'leading'
            ? chevronNode
            : item.trigger.props.leadingIcon,
          trailingIcon: resolvedChevron === 'trailing'
            ? chevronNode
            : item.trigger.props.trailingIcon,
        });

      return (
        <RadixAccordion.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          data-slot="accordion-item"
          className={cn(accordionItemVariants({
            orientation: resolvedOrientation,
            size: resolvedSize,
          }))}
        >
          <RadixAccordion.Header asChild>
            <h3 className="flex">
              <RadixAccordion.Trigger
                asChild
                data-slot="accordion-trigger"
                className={cn(accordionTriggerVariants({ size: resolvedSize }))}
              >
                {triggerWithChevron}
              </RadixAccordion.Trigger>
            </h3>
          </RadixAccordion.Header>
          <RadixAccordion.Content
            data-slot="accordion-content"
            className={cn(
              collapsibleContentVariants({ size: resolvedSize }),
              accordionContentSpacingVariants({ size: resolvedSize }),
            )}
          >
            {item.content}
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      );
    });

    const rootClassName = cn(accordionVariants({
      orientation: resolvedOrientation,
      size: resolvedSize,
    }));

    if (isMultiple) {
      const {
        items: _items,
        size: _size,
        orientation: _orientation,
        chevron: _chevron,
        type: _type,
        value,
        defaultValue: _defaultValue,
        onValueChange,
        ...rest
      } = props;

      const handleMultipleChange = (next: string[]): void => {
        if (!isControlled) setUncontrolledValue(next);
        onValueChange?.(next);
      };

      const multipleValue = (Array.isArray(resolvedValue)
        ? resolvedValue
        : []) as string[];

      return (
        <RadixAccordion.Root
          ref={ref}
          type="multiple"
          orientation={resolvedOrientation}
          value={isControlled
            ? (value ?? multipleValue)
            : multipleValue}
          onValueChange={handleMultipleChange}
          data-slot="accordion-root"
          data-size={resolvedSize}
          data-orientation={resolvedOrientation}
          data-state={rootState}
          data-chevron={resolvedChevron}
          className={rootClassName}
          {...rest}
        >
          {renderItems}
        </RadixAccordion.Root>
      );
    }

    const {
      items: _items,
      size: _size,
      orientation: _orientation,
      chevron: _chevron,
      type: _type,
      value,
      defaultValue: _defaultValue,
      onValueChange,
      collapsible,
      ...rest
    } = props;

    const handleSingleChange = (next: string): void => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    const singleValue = (typeof resolvedValue === 'string'
      ? resolvedValue
      : '');

    return (
      <RadixAccordion.Root
        ref={ref}
        type="single"
        orientation={resolvedOrientation}
        value={isControlled
          ? (value ?? singleValue)
          : singleValue}
        onValueChange={handleSingleChange}
        collapsible={collapsible ?? true}
        data-slot="accordion-root"
        data-size={resolvedSize}
        data-orientation={resolvedOrientation}
        data-state={rootState}
        data-chevron={resolvedChevron}
        className={rootClassName}
        {...rest}
      >
        {renderItems}
      </RadixAccordion.Root>
    );
  },
);
Accordion.displayName = 'Accordion';

export { Accordion };
