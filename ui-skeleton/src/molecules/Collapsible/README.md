# Collapsible

Single-encapsulated wrapper over Radix's Collapsible primitive. Pairs a
consumer-supplied trigger element with a show/hide content region and (by
default) an auto-injected rotating chevron icon.

## Import

```ts
import { Collapsible } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                        | Default      |
| ------------- | ------------------------------------------- | ------------ |
| size          | `'sm' \| 'md' \| 'lg'`                      | `'md'`       |
| chevron       | `'leading' \| 'trailing' \| 'none'`         | `'trailing'` |
| trigger       | `ReactElement` (typically a `Button` atom)  | required     |
| open          | `boolean` (controlled open state)           | —            |
| defaultOpen   | `boolean` (uncontrolled initial open state) | `false`      |
| onOpenChange  | `(open: boolean) => void`                   | —            |
| children      | `ReactNode` (content shown when open)       | —            |

All other props are forwarded to the underlying Radix Collapsible root (a
`<div>`). `className` is not a public prop — styling is controlled exclusively
through `size` and `chevron`.

## Variants

| size | Trigger-to-content gap | Auto-chevron icon size |
| ---- | ---------------------- | ---------------------- |
| `sm` | `gap-1`                | `size-3`               |
| `md` | `gap-2`                | `size-4`               |
| `lg` | `gap-3`                | `size-5`               |

| chevron     | Behavior                                                        |
| ----------- | --------------------------------------------------------------- |
| `leading`   | Injected into the trigger's `leadingIcon` slot                  |
| `trailing`  | Injected into the trigger's `trailingIcon` slot                 |
| `none`      | No chevron injected — consumer owns the trigger's iconography   |

The resolved variants are reflected on the rendered root as
`data-size="<name>"` and `data-chevron="<name>"`. Slots expose
`data-slot="collapsible-root"`, `data-slot="collapsible-content"`, and (when
the chevron is injected) `data-slot="collapsible-chevron"`. The chevron span
carries its own `data-state="open" | "closed"` attribute driven by the open
state — a Tailwind `data-[state=open]:rotate-180` selector rotates the icon.

## Composition

- **Composed primitive:** `@radix-ui/react-collapsible` provides the root,
  trigger, and content sub-components. The trigger is wrapped internally via
  `<RadixCollapsible.Trigger asChild>{trigger}</RadixCollapsible.Trigger>`,
  meaning Radix's `data-state`, `aria-expanded`, and `aria-controls`
  attributes merge onto the consumer's trigger element.
- **Composed atom:** `Button` is the expected `trigger` element. The molecule
  clones the trigger via `React.cloneElement` and injects a rotating
  `ChevronDown` icon into the matching `leadingIcon` or `trailingIcon` slot.
  Any other element with `leadingIcon` / `trailingIcon` props of type
  `React.ReactNode` will work too.
- **Variant propagation via a lookup table.** The `chevronSizeForSize` table
  maps the molecule's `size` axis to Tailwind size utilities applied to the
  injected `ChevronDown` icon. The trigger's own `size` is owned by the
  consumer — the molecule does NOT propagate `size` to the trigger Button.
- **No `className` flows downward.** The cloned trigger is given only
  `leadingIcon` / `trailingIcon` overrides — never `className`. The chevron
  span uses its own `className` because the molecule owns that element.
- **Internal open-state tracking.** When uncontrolled, the molecule manages
  open state via `React.useState` so the chevron span can carry an own
  `data-state` attribute. The molecule respects `open` + `onOpenChange` when
  the consumer controls externally.
- **Layer-import direction.** Collapsible imports `@/atoms/Button` (types
  only, for documentation), `@/particles/cn`, `@radix-ui/react-collapsible`,
  and `lucide-react`. It does NOT import other molecules, organisms,
  templates, pages, or providers — enforced by the `no-restricted-imports`
  rule in `eslint.config.mjs`.

## Accessibility

- Radix automatically wires `aria-expanded` and `aria-controls` on the
  trigger and `id` on the content panel via the merged `asChild` props — no
  additional ARIA work required for the common case.
- The injected chevron is decorative (`aria-hidden`) because the trigger's
  text label already communicates the action.
- Use a real `<button>`-like trigger (e.g. the `Button` atom) so keyboard
  activation works via Space and Enter without extra wiring.
- The molecule does NOT impose semantics on the content region — supply a
  heading element inside `children` if the section needs to participate in
  the document outline.

## Do / Don't

- DO tune visuals through `size` and `chevron`. DO pass a `Button` atom as
  the `trigger` for the common case — it satisfies the `leadingIcon` /
  `trailingIcon` contract automatically.
- DO use `chevron="leading"` for sidebar-style toggles and `chevron="trailing"`
  for inline disclosure triggers. DO use `chevron="none"` when the trigger
  already conveys the open/closed state through other iconography.
- DO control open state via `open` + `onOpenChange` when external state
  (URL, store, parent component) drives the disclosure. DO use `defaultOpen`
  for purely local uncontrolled state.
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger` —
  Radix's `asChild` pattern uses `React.cloneElement`, which requires a
  single element child. The TypeScript signature (`React.ReactElement`)
  surfaces this at compile time.
- DON'T pass `className` to Collapsible or to the trigger element you supply
  — the molecule and the composed `Button` atom both reject it at the type
  level. If a styling knob is missing, add a variant axis.
- DON'T reach for Collapsible when you need multiple coordinated panels
  (e.g. an accordion with single-open behavior) — use an organism-level
  Accordion wrapper instead.
