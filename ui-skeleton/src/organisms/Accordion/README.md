# Accordion

Canonical organism composing the Collapsible molecule's content-styling
variants and wrapping `@radix-ui/react-accordion` for multi-item open/close
coordination. Auto-injects a rotating chevron into each item's trigger via
`React.cloneElement`, following the same chevron-injection pattern as the
Collapsible molecule.

## Import

```ts
import { Accordion } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                       | Default      |
| ------------- | -------------------------------------------------------------------------- | ------------ |
| type          | `'single' \| 'multiple'`                                                   | —            |
| items         | `AccordionItemEntry[]`                                                     | —            |
| size          | `'sm' \| 'md' \| 'lg'`                                                     | `'md'`       |
| orientation   | `'vertical' \| 'horizontal'`                                               | `'vertical'` |
| chevron       | `'leading' \| 'trailing' \| 'none'`                                        | `'trailing'` |
| value         | `string` (single) \| `string[]` (multiple)                                 | —            |
| defaultValue  | `string` (single) \| `string[]` (multiple)                                 | —            |
| onValueChange | `(value: string) => void` (single) \| `(value: string[]) => void` (multiple) | — |
| collapsible   | `boolean` (single-mode only — allow re-collapse of the open item)          | `true`       |
| dir           | `'ltr' \| 'rtl'`                                                           | —            |

All other props are forwarded to the underlying Radix Accordion Root (a
`<div>`). `className` is not a public prop — styling is controlled exclusively
through `size`, `orientation`, and `chevron`.

### AccordionItemEntry

| Field    | Type             | Default | Notes                                                              |
| -------- | ---------------- | ------- | ------------------------------------------------------------------ |
| type     | `'item'`         | —       | Discriminated-union tag — required, not optional                   |
| value    | `string`         | —       | Stable React key + Radix selection identifier; must be unique      |
| trigger  | `ReactElement`   | —       | Single element with `leadingIcon` / `trailingIcon` slots           |
| content  | `ReactNode`      | —       | Body rendered inside the expanding region                          |
| disabled | `boolean`        | `false` | Disables this individual item                                      |

## Variants

| size | Trigger padding | Content bottom padding | Chevron icon size |
| ---- | --------------- | ---------------------- | ----------------- |
| `sm` | `py-2 text-xs`  | `pb-2`                 | `size-3`          |
| `md` | `py-3 text-sm`  | `pb-3`                 | `size-4`          |
| `lg` | `py-4 text-base`| `pb-4`                 | `size-5`          |

| orientation  | Layout                                  |
| ------------ | --------------------------------------- |
| `vertical`   | `flex-col`; items separated by bottom border |
| `horizontal` | `flex-row`; items separated by right border  |

| chevron     | Behaviour                                                       |
| ----------- | --------------------------------------------------------------- |
| `leading`   | Injected into each trigger's `leadingIcon` slot                 |
| `trailing`  | Injected into each trigger's `trailingIcon` slot                |
| `none`      | No chevron injected — trigger owns its iconography              |

The resolved variants are reflected on the rendered root as
`data-slot="accordion-root"`, `data-size`, `data-orientation`, `data-state`
(`open` when any item is open, `closed` otherwise), and `data-chevron`. Radix
sets `data-state="open" | "closed"` on each item and on each trigger so
downstream styling and tests can observe per-item state. The chevron span
carries its own `data-state` attribute driven by the resolved value — a
Tailwind `data-[state=open]:rotate-180` selector rotates the icon.

## Composition

- **Composed molecule:** `Collapsible` provides the canonical content-styling
  variant chain via `collapsibleContentVariants`. The Accordion organism
  reuses it for per-item content text sizing and pairs it with its own
  `accordionContentSpacingVariants` for per-size padding. This is the
  canonical organism-composes-molecule demonstration.
- **Composed primitive:** `@radix-ui/react-accordion` provides the Root, Item,
  Header, Trigger, and Content sub-components — including multi-item
  coordination, single/multiple open semantics, ARIA wiring
  (`aria-expanded`, `aria-controls`, `aria-orientation`), and roving-focus
  keyboard navigation. Each `<RadixAccordion.Trigger asChild>` wraps the
  consumer-supplied trigger element so Radix's `data-state` and
  `aria-expanded` attributes merge onto it.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own `size` axis to the chevron icon size and to the composed
  content variants:

  ```ts
  const chevronSizeForSize = { sm: 'size-3', md: 'size-4', lg: 'size-5' } as const;
  // collapsibleContentVariants({ size }) + accordionContentSpacingVariants({ size })
  ```

  Direct passthrough is used where the axes align (Accordion's `size` →
  Collapsible's `size`).
- **Auto-injected chevron via `React.cloneElement`.** Each item's trigger is
  cloned to inject a rotating `ChevronDown` span into the matching
  `leadingIcon` / `trailingIcon` slot. The chevron's `data-state` is driven by
  the organism's resolved value (so the rotation works even though Radix owns
  per-item open state) — mirrors the Collapsible molecule's own chevron
  pattern.
- **No `className` flows downward.** The organism does not accept `className`
  and does not forward any class string into the Radix subcomponents beyond
  its own `cn(...)` output. The cloned trigger receives only `leadingIcon` /
  `trailingIcon` overrides — never `className`. If a styling knob is missing,
  add a variant axis.
- **Slot prop vocabulary.** `items[]` is the only data slot; each entry's
  `trigger` and `content` slots render raw inside the composed Radix
  sub-components. The organism does not inject styling into consumer-supplied
  nodes.
- **Internal state via the controlled-passthrough pattern.** When uncontrolled
  the organism manages `value` via `React.useState` so the per-item chevron
  span can carry an own `data-state`. When the consumer passes `value` +
  `onValueChange`, the organism delegates to that controlled flow and never
  flips its internal state.
- **Layer-import direction.** Imports `@/molecules/Collapsible`,
  `@/particles/cn`, `@radix-ui/react-accordion`, and `lucide-react`. Does NOT
  import other organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Radix automatically wires `aria-expanded` and `aria-controls` on each
  trigger and `id` on each content panel via the merged `asChild` props — no
  additional ARIA work is required for the common case.
- The Trigger element is wrapped in an `<h3>` Header (per Radix's recommended
  pattern) so each accordion section participates in the document outline.
- The injected chevron is decorative (`aria-hidden`) because each trigger's
  text label already communicates the action.
- Disabled items receive a real `disabled` attribute on the underlying
  `<button>` via Radix; the organism still renders the descriptor row.
- Keyboard navigation works via Arrow keys (Radix roving-focus); Space and
  Enter toggle the focused item. In `single` mode, `collapsible` (default
  `true`) controls whether the open item can be re-collapsed by clicking it.
- The accessible name for the accordion group itself is the consumer's
  responsibility — pass `aria-label` or `aria-labelledby` on the root via the
  forwarded props if the surrounding context does not already name the
  region.

## Do / Don't

- DO tune visuals through `size`, `orientation`, and `chevron`. If a knob
  isn't covered, add a variant axis — styling is the organism's
  responsibility, not the consumer's.
- DO pick `type='single'` for one-at-a-time disclosure and `type='multiple'`
  for independent panels. DON'T attempt to switch `type` mid-flight on the
  same instance — TypeScript treats the two as separate discriminated
  branches and the runtime state model differs (`string` vs `string[]`).
- DO control selection via `value` + `onValueChange` when external state
  drives the choice. DO use `defaultValue` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DO pass a `Button` atom as each item's `trigger` — it satisfies the
  `leadingIcon` / `trailingIcon` contract automatically and inherits the
  Button atom's variant + size axes.
- DON'T pass a `React.Fragment`, string, array, or `null` as a `trigger` —
  the descriptor signature (`React.ReactElement`) surfaces this at compile
  time because `React.cloneElement` requires a single element child.
- DON'T pass `className` to Accordion or to the trigger elements you supply —
  the organism and the composed `Button` atom both reject it at the type
  level. If a styling knob is missing, add a variant axis.
- DON'T reuse the same `value` across descriptors — `value` doubles as the
  React key, the Radix selection identifier, and the open-state lookup;
  collisions break selection.
