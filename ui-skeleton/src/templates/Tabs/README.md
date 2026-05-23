# Tabs

Canonical template wrapping `@radix-ui/react-tabs` and composing the `Button`
atom for triggers + raw `<RadixTabs.Content>` for content panels. Provides an
orientation-aware section frame with active-tab coordination via Radix and a
controlled-passthrough state pattern.

## Import

```ts
import { Tabs } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                          | Default       |
| ------------- | ----------------------------- | ------------- |
| items         | `TabsItemEntry[]`             | —             |
| size          | `'sm' \| 'md' \| 'lg'`        | `'md'`        |
| orientation   | `'horizontal' \| 'vertical'`  | `'horizontal'`|
| density       | `'compact' \| 'comfortable'`  | `'comfortable'`|
| value         | `string`                      | —             |
| defaultValue  | `string`                      | first item    |
| onValueChange | `(value: string) => void`     | —             |
| aria-label    | `string`                      | —             |
| dir           | `'ltr' \| 'rtl'`              | —             |

All other props are forwarded to the underlying Radix Tabs Root (a `<div>`).
`className` is not a public prop — styling is controlled exclusively through
`size`, `orientation`, and `density`.

### TabsItemEntry

| Field    | Type        | Default | Notes                                                    |
| -------- | ----------- | ------- | -------------------------------------------------------- |
| value    | `string`    | —       | Stable React key + Radix selection identifier + panel id |
| trigger  | `ReactNode` | —       | Content rendered inside the composed `Button` atom       |
| content  | `ReactNode` | —       | Body rendered inside the matching `<RadixTabs.Content>`  |
| disabled | `boolean`   | `false` | Disables this individual trigger (Radix blocks selection)|

## Variants

| size | Button atom size | Trigger rail gap | Content text size |
| ---- | ---------------- | ---------------- | ----------------- |
| `sm` | `sm`             | `gap-1`          | `text-xs`         |
| `md` | `md`             | `gap-1.5`        | `text-sm`         |
| `lg` | `lg`             | `gap-2`          | `text-base`       |

| orientation  | Layout                                            |
| ------------ | ------------------------------------------------- |
| `horizontal` | `flex-col` root; trigger rail above content panel |
| `vertical`   | `flex-row` root; trigger rail beside content panel|

| density       | Trigger rail padding |
| ------------- | -------------------- |
| `compact`     | `p-0.5`              |
| `comfortable` | `p-1`                |

The resolved variants are reflected on the rendered root as
`data-slot="tabs-root"`, `data-size`, `data-orientation`, `data-density`, and
`data-state` (`active` when a value is resolved, `inactive` otherwise). Radix
sets `data-state="active" | "inactive"` on each trigger and on each panel so
downstream styling and tests can observe per-tab state.

## Composition

- **Composed atom:** `Button` provides the canonical trigger surface — the
  composed `Button` is wrapped via `<RadixTabs.Trigger asChild>` so Radix's
  `data-state`, `aria-selected`, and `aria-controls` attributes merge onto
  it. This is the canonical template-composes-atom demonstration.
- **Composed primitive:** `@radix-ui/react-tabs` provides the Root, List,
  Trigger, and Content sub-components — including roving-focus keyboard
  navigation, ARIA wiring (`role="tablist"`, `role="tab"`, `role="tabpanel"`,
  `aria-orientation`, `aria-selected`, `aria-controls`), and active-panel
  coordination.
- **Variant propagation via lookup tables.** The template owns the mapping
  from its own `size` axis to the composed `Button` atom's `size` axis and
  the mapping from active state to the composed `Button` atom's `variant`
  axis:

  ```ts
  const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const buttonVariantForActive = { active: 'secondary', inactive: 'ghost' } as const;
  ```

  Direct passthrough is used for `size` (the axes align). Active state is
  derived from the resolved value via the controlled-passthrough pattern
  and indexed into the variant table per trigger render.
- **No `className` flows downward.** Organisms, molecules, and atoms reject
  `className` both at the type level and at runtime. The template's own
  `cn(...)` output drives Root + List + Content classes; the composed
  `Button` atom receives only `size`, `variant`, and `disabled` props —
  never a `className` string. If a styling knob is missing, add a variant
  axis on the template (layout-level granularity) or on the `Button` atom
  (general-purpose).
- **Slot prop vocabulary.** `items[]` is the only data slot; each entry's
  `trigger` and `content` slots render raw inside the composed Radix
  sub-components. The template does not inject styling into
  consumer-supplied nodes.
- **Internal state via the controlled-passthrough pattern.** When
  uncontrolled the template manages the active value via `React.useState`
  so per-trigger variant propagation can be driven from a known active
  value. When the consumer passes `value` + `onValueChange`, the template
  delegates to that controlled flow and never flips its internal state.
- **Layer-import direction.** Imports `@/atoms/Button`, `@/particles/cn`,
  and `@radix-ui/react-tabs`. Does NOT import other templates, pages, or
  providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`. If composition of another template is required, the
  answer is "lift the shared surface to a particle" (see the Sheet /
  Sidebar precedent), not "open a guard exception".

## Accessibility

- Radix wires `role="tablist"`, `role="tab"`, and `role="tabpanel"`
  automatically, along with `aria-selected`, `aria-controls`, and the
  bidirectional `aria-labelledby` link between each panel and its trigger.
- `aria-orientation` is set on the tab list to match the resolved
  `orientation` axis so screen readers announce vertical vs horizontal
  navigation correctly.
- Pass `aria-label` (or `aria-labelledby` via the forwarded props) to name
  the tab list — the accessible name for the tabs group itself is the
  consumer's responsibility.
- Keyboard navigation works via Arrow keys (Radix roving-focus) along the
  axis matching `orientation`; Home / End jump to the first / last
  enabled tab; Space and Enter activate the focused tab when Radix is in
  manual-activation mode (the default is automatic activation, i.e. focus
  follows selection).
- Disabled items receive a real `disabled` attribute on the underlying
  `<button>` via Radix; the trigger stays in the tab order's
  programmatically-focusable set per the WAI-ARIA tabs pattern.

## Do / Don't

- DO tune visuals through `size`, `orientation`, and `density`. If a knob
  isn't covered, add a variant axis — styling is the template's
  responsibility, not the consumer's.
- DO control selection via `value` + `onValueChange` when external state
  drives the choice. DO use `defaultValue` for purely local uncontrolled
  state. DON'T mix the two on the same instance — controlled values are
  authoritative and the template never flips its internal state when
  `value` is defined.
- DO pass a short string or a single inline element (icon + label) as each
  item's `trigger`. The descriptor type is `React.ReactNode` so arrays and
  fragments are permitted, but the composed `Button` atom is the rendered
  element — keep the content visually balanced.
- DON'T pass `className` to Tabs or to any descriptor entry — the template
  and the composed `Button` atom both reject it at the type level. If a
  styling knob is missing, add a variant axis.
- DON'T reuse the same `value` across descriptors — `value` doubles as the
  React key, the Radix selection identifier, and the active-state lookup;
  collisions break selection and panel linking.
- DON'T attempt to wrap the composed `Button` atom in another element to
  inject a `className` — the `asChild` plumbing breaks if the rendered
  trigger isn't a single Radix-compatible child.
