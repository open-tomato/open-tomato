# NavigationMenu

Viewport-based template wrapping `@radix-ui/react-navigation-menu` and
composing the `Button` atom for menu triggers. Renders a `<nav>` containing
a trigger rail plus a shared Viewport host that projects the active menu's
Content panel.

## Import

```ts
import { NavigationMenu } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                              | Default        |
| ------------- | --------------------------------- | -------------- |
| items         | `NavigationMenuItem[]`            | —              |
| orientation   | `'horizontal' \| 'vertical'`      | `'horizontal'` |
| value         | `string`                          | —              |
| defaultValue  | `string`                          | `''`           |
| onValueChange | `(value: string) => void`         | —              |
| aria-label    | `string`                          | —              |
| dir           | `'ltr' \| 'rtl'`                  | —              |
| delayDuration | `number`                          | `200`          |
| skipDelayDuration | `number`                      | `300`          |

All other props are forwarded to the underlying Radix Root (a `<nav>`).
`className` is not a public prop — styling is controlled exclusively through
`orientation`.

### NavigationMenuItem (discriminated union)

| Discriminator        | Fields                                     | Renders as                                  |
| -------------------- | ------------------------------------------ | ------------------------------------------- |
| `type: 'link'`       | `label`, `href`, `leading?`                | `<a href>` via Radix `NavigationMenu.Link`  |
| `type: 'menu'`       | `label`, `content`                         | `Button` atom trigger + projected Viewport  |
| `type: 'separator'`  | (none)                                     | `<li role="separator" aria-hidden>` rule    |

The `type` discriminator is required (not optional) so `items.map(...)`
narrows correctly between branches. Menu entries omit a `value` field —
the template derives a stable Radix value from the descriptor index
(`navigation-menu-item-${index}`). Consumers reordering items at runtime
should pass a fresh `items` array on each render so React re-keys cleanly.

## Variants

| orientation  | Layout                                                              |
| ------------ | ------------------------------------------------------------------- |
| `horizontal` | Trigger rail flows row-wise; Viewport anchors below the rail        |
| `vertical`   | Trigger rail stacks column-wise; Viewport renders inline below it   |

The resolved variant is reflected on the rendered root as
`data-slot="navigation-menu-root"`, `data-orientation`, and `data-state`
(`active` when a menu is open, `inactive` otherwise). Radix sets
`data-state="open" | "closed"` on each trigger and on each projected
Content panel so downstream styling and tests can observe per-menu state.

## Composition

- **Composed atom:** `Button` provides the canonical trigger surface for
  every `type: 'menu'` entry. The composed `Button` is wrapped via
  `<RadixNavigationMenu.Trigger asChild>` so Radix's `data-state`,
  `aria-expanded`, and `aria-controls` attributes merge onto the rendered
  `<button>` element. This is the canonical template-composes-atom
  demonstration for the viewport-based shape.
- **Composed primitive:** `@radix-ui/react-navigation-menu` provides the
  Root, List, Item, Trigger, Link, Content, and Viewport sub-components —
  including roving-focus keyboard navigation, ARIA wiring (`role="link"`,
  `aria-expanded`, `aria-controls`, `aria-orientation`), the active-menu
  projection into the shared Viewport, and the dismissable-layer
  outside-click / escape handling.
- **Variant propagation via the active-menu lookup table.** The template's
  only public axis (`orientation`) maps to the per-subpart cva blocks
  directly (no Button axis interaction). The active-menu state, by
  contrast, maps to the Button atom's `variant` axis via a lookup table:

  ```ts
  const buttonVariantForActive = { active: 'secondary', inactive: 'ghost' } as const;
  ```

  The currently-open menu's `Button` receives `variant="secondary"`; idle
  menus receive `variant="ghost"`. The active value is derived from the
  controlled-passthrough state — when `value` is supplied the template
  reads from it directly; otherwise the internal `React.useState` owns the
  active value so per-trigger variant propagation can be driven from a
  known active key.
- **No `className` flows downward.** The composed `Button` atom rejects
  `className` both at the type level and at runtime. The decorative
  chevron auto-injected as the trigger's `trailingIcon` carries a
  `data-open=""` attribute (stamped from the template's active-menu
  state) and its rotation is driven by a `data-[open]:rotate-180`
  selector on the chevron itself. The Button's `ghost`/`secondary`
  variant swap covers the open-state surface treatment.
- **Slot prop vocabulary.** `items[]` is the only data slot; each
  descriptor's slot fields render raw inside the matching Radix
  sub-component. The template does not inject styling into
  consumer-supplied nodes (links' `leading` slot renders verbatim inside
  an `aria-hidden` span sized by the link icon cva).
- **Internal state via the controlled-passthrough pattern.** When
  uncontrolled, `React.useState<string>('')` owns the active-menu value
  so the Button variant lookup can read from it. When the consumer
  passes `value` + `onValueChange`, the template delegates to that
  controlled flow and never flips its internal state.
- **Layer-import direction.** Imports `@/atoms/Button`, `@/particles/cn`,
  `@radix-ui/react-navigation-menu`, and `lucide-react` (for the
  decorative chevron). Does NOT import other templates, pages, or
  providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`. If composition of another template is required,
  the answer is "lift the shared surface to a particle" (see the Sheet /
  Sidebar precedent), not "open a guard exception".

### Portal pitfalls applied to the viewport-based Content

The viewport-projected Content treats its rendered DOM as portaled even
though Radix renders the Viewport inline inside the `<nav>` rather than
through a `document.body` portal:

- **Tests scan `document.body` with axe** (not `container`). Even though
  the Viewport's projected DOM lives inside the test render container,
  scanning `document.body` keeps the test resilient to any future Radix
  upgrade that moves the viewport into a true portal.
- **No `data-side` / `data-placement` re-emission** from the template.
  Radix owns the viewport's positioning math; the `orientation` axis is
  the consumer's request, not the resolved position.
- **`bg-background` / `text-foreground` on the viewport surface**, NOT
  `bg-popover` / `text-popover-foreground` — the latter Tailwind tokens
  are not declared in `@theme` under the current `globals.css` and would
  silently drop styling. Documented in `skills/styling/SKILL.md`.
- **`accessible name on the nav landmark`.** The consumer is responsible
  for the `<nav>` element's accessible name via the public `aria-label`
  prop (or `aria-labelledby` via the forwarded `{...rest}` spread).
  axe's `landmark-unique` rule fires when two `<nav>` landmarks share
  the same accessible name on the same page.

## Accessibility

- Radix renders the Root as `<nav>`, the List as `<ul>`, each Item as
  `<li>`, each Trigger as `<button aria-expanded aria-controls>`, and
  each Link as `<a href>` — the WAI-ARIA navigation pattern out of the
  box.
- The `orientation` axis propagates to Radix's `orientation` prop, which
  reflects on the rendered root as `data-orientation` and adjusts the
  roving-focus key bindings (`ArrowLeft`/`ArrowRight` for horizontal;
  `ArrowUp`/`ArrowDown` for vertical).
- Pass `aria-label` (or `aria-labelledby` via the forwarded props) to
  name the `<nav>` landmark — the accessible name for the navigation
  group itself is the consumer's responsibility. When multiple
  `<nav>` landmarks live on the same page each MUST have a unique
  accessible name.
- The decorative separator entry renders as a
  `<li role="separator" aria-hidden>` outside Radix's keyboard-nav
  traversal, with `aria-orientation` set to the cross-axis (vertical
  separator for horizontal menus, horizontal separator for vertical
  menus) so AT users perceive it as a visual divider, not a navigable
  item.
- The auto-injected chevron carries `aria-hidden` because the trigger's
  accessible name comes from the `label` field; the chevron is purely
  decorative.

## Do / Don't

- DO tune visuals through `orientation`. If a knob isn't covered, add a
  variant axis — styling is the template's responsibility, not the
  consumer's.
- DO control selection via `value` + `onValueChange` when external state
  drives which menu is open (e.g. URL-synced top nav). DO use
  `defaultValue` for purely local uncontrolled state. DON'T mix the two
  on the same instance — controlled values are authoritative and the
  template never flips its internal state when `value` is defined.
- DO pass a string or a single inline element (icon + label) as each
  item's `label`. Menu `content` accepts arbitrary `React.ReactNode`
  for the projected panel body.
- DON'T pass `className` to NavigationMenu, to any descriptor entry, or
  through the descriptor's `content` slot — the template, the composed
  `Button` atom, and the viewport-projected Content all reject it at
  the type level. If a styling knob is missing, add a variant axis.
- DON'T attempt to wrap the composed `Button` atom in another element
  to inject a `className` — the `asChild` plumbing on Radix Trigger
  breaks if the rendered trigger isn't a single Radix-compatible child.
- DON'T render two NavigationMenu instances with the same `aria-label`
  on the same page — axe's `landmark-unique` rule fires and AT users
  cannot disambiguate the two `<nav>` landmarks.
