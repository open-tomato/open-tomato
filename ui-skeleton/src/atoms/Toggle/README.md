# Toggle

Single-entry wrapper over Radix `@radix-ui/react-toggle`. Renders a two-state
button (on / off) with a `variant` axis (`default | outline`) and a `size`
axis (`sm | md | lg`).

## Import

```ts
import { Toggle } from '@open-tomato/ui-skeleton';
```

## Props

| Prop              | Type                              | Default     |
| ----------------- | --------------------------------- | ----------- |
| variant           | `'default' \| 'outline'`          | `'default'` |
| size              | `'sm' \| 'md' \| 'lg'`            | `'md'`      |
| pressed           | `boolean`                         | —           |
| defaultPressed    | `boolean`                         | `false`     |
| onPressedChange   | `(pressed: boolean) => void`      | —           |
| disabled          | `boolean`                         | `false`     |
| className         | `string` (escape hatch)           | —           |

All other props are forwarded to the underlying Radix Toggle root (a native
`<button>`), including `aria-label`, `aria-labelledby`, and event handlers.

## Variants

| variant   | Visual frame                                                            |
| --------- | ----------------------------------------------------------------------- |
| `default` | Transparent background; `bg-accent` on pressed.                         |
| `outline` | Bordered (`border-input`); highlights on hover; `bg-accent` on pressed. |

| size | Geometry                |
| ---- | ----------------------- |
| `sm` | `h-8 px-2.5`            |
| `md` | `h-9 px-3` (default)    |
| `lg` | `h-10 px-4`             |

The resolved pressed state is reflected on the root as `data-state="on"` or
`data-state="off"` (set by Radix). The resolved variant and size are reflected
as `data-variant="<name>"` and `data-size="<name>"` (set by this wrapper) for
test and style hooks. The root also carries `data-slot="toggle"`.

## Accessibility

- The rendered element is a native `<button>` and carries `aria-pressed`
  (managed by Radix) so screen readers announce the on / off state.
- Provide an accessible name via `aria-label` or `aria-labelledby` when the
  toggle's purpose is conveyed by an icon alone.
- Keyboard activation works via `Space` and `Enter` (native button behavior).
- `disabled` suppresses pointer and keyboard interaction and is reflected as
  the native `disabled` attribute.

## Do / Don't

- DO use `variant` and `size` for visual customization. DON'T pass arbitrary
  `className` for color overrides; add a new variant if a recurring style is
  needed.
- DO provide an `aria-label` for icon-only toggles. DON'T ship a toggle
  without an accessible name.
- DO use `defaultPressed` for uncontrolled toggles; use `pressed` +
  `onPressedChange` for controlled state. DON'T mix the two — choose one mode.
- DO use Toggle for a single on / off control. For a group of mutually
  exclusive or multi-select toggles, prefer a future `ToggleGroup` atom.
