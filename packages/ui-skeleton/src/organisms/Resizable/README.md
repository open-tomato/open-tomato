# Resizable

Items[]-driven organism that wraps
[`react-resizable-panels`](https://github.com/bvaughn/react-resizable-panels)
for a resizable panel layout. Consumers declare panels and handles via a
single `items[]` descriptor array; the organism renders them in order and
delegates the drag math, min/max clamping, and ARIA wiring to the library.

## Import

```ts
import { Resizable } from '@open-tomato/ui-skeleton';
```

## Props

| Prop      | Type                              | Default        |
| --------- | --------------------------------- | -------------- |
| items     | `ResizableItem[]` (required)      | —              |
| direction | `'horizontal' \| 'vertical'`      | `'horizontal'` |
| id        | `string \| number`                | library `useId` |
| disabled  | `boolean`                         | `false`        |

All other native `HTMLDivElement` attributes are forwarded to the
underlying `Group` element via the rest spread. `className` and
`orientation` are intentionally omitted at the type level — styling
flows through the `direction` axis and there is no public `className`
escape hatch.

## Items[] descriptor union

| `type`   | Shape                                                                                       | Notes                                                                          |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `panel`  | `{ type: 'panel', id?, defaultSize?, minSize?, maxSize?, content, disabled? }`             | Renders a `Panel`. `id` is the React key and the library's `data-panel` value. |
| `handle` | `{ type: 'handle', withHandle?, disabled? }`                                                | Renders a `Separator`. When `withHandle: true`, a grip indicator is shown.     |

Consumers explicitly interleave `{ type: 'handle' }` descriptors between
panels — the organism does NOT auto-inject handles. Each entry interface
(`ResizablePanelEntry`, `ResizableHandleEntry`, `ResizableItem`) is
exported so consumers building items[] dynamically can `satisfies`
against the right union member.

### Size units

Panel `defaultSize`, `minSize`, and `maxSize` accept either:

- A bare number — interpreted as **pixels**.
- A bare string — interpreted as a **percentage** of the parent group
  (`'33'` or `'33%'`).
- A string with a CSS unit — interpreted as the unit (`'200px'`,
  `'10rem'`, `'50vh'`, `'30vw'`).

The library validates and clamps sizes at runtime; values outside
`[minSize, maxSize]` snap to the nearest bound.

## Variants

| direction    | Layout                                            |
| ------------ | ------------------------------------------------- |
| `horizontal` | Panels arranged left-to-right; handles are 1px vertical bars   |
| `vertical`   | Panels arranged top-to-bottom; handles are 1px horizontal bars |

The resolved variant is reflected on the rendered root as
`data-slot="resizable-root"` and `data-direction`. Each handle carries
`data-slot="resizable-handle"`, `data-direction`,
`data-with-handle="true" | "false"`, and `data-disabled="true" | "false"`
so downstream styling and tests can observe the resolved state without
className introspection. The library additionally renders
`role="separator"` on every handle with `aria-orientation`,
`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-controls`
auto-wired against the adjacent panel ids.

## Composition

- **Wrapped library:** `react-resizable-panels` provides the `Group`,
  `Panel`, and `Separator` sub-components — including the drag math,
  keyboard-driven resizing (arrow keys when the separator is focused),
  min/max clamping, and the ARIA wiring described above. The library
  owns the `display`, `flex-direction`, `flex-wrap`, and `overflow`
  styles on the Group; the organism's cva covers sizing and the
  `data-direction` hook only.
- **No molecule or atom composition.** Resizable is a pure
  library-wrapping organism — the rendered subtree is library elements
  plus a small grip decoration. The decoration uses the `GripVertical`
  icon from `lucide-react`, rotated 90° in vertical mode via a
  descendant `[&_svg]:rotate-90` selector on the decoration cva.
- **Variant propagation via direct passthrough.** The `direction` axis
  is passed directly to the library's `Group.orientation` prop and is
  used as the cva index for the handle and decoration variants — no
  explicit lookup table is required because the organism owns one axis
  and the library's vocabulary matches it 1:1.
- **No `className` flows downward.** The organism does not expose
  `className` on its public API and does not forward any class string
  into descriptor content beyond its own `cn(...)` output. The library's
  `Group`, `Panel`, and `Separator` accept `className`, but the organism
  drives those classes through the colocated cva — consumers cannot
  override them. If a styling knob is missing, add a variant axis.
- **Slot prop vocabulary.** `items[]` is the only data slot; each
  panel descriptor's `content` renders raw inside the library's
  `Panel`. The organism does not inject styling into consumer-supplied
  content beyond the panel's overflow/relative defaults.
- **Layer-import direction.** Imports `@/particles/cn`,
  `react-resizable-panels`, and `lucide-react`. Does NOT import other
  organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The library renders each handle with `role="separator"` and a full
  set of WAI-ARIA properties (`aria-orientation`, `aria-valuemin`,
  `aria-valuemax`, `aria-valuenow`, `aria-controls`). No additional
  ARIA work is required for the common case.
- Keyboard navigation: focusing a handle (Tab) and pressing arrow keys
  resizes the adjacent panels. The library exposes `Home` and `End` for
  jumping to the min and max sizes. Double-clicking a handle resets it
  to the panel's default size unless `disableDoubleClick` is set on
  the descriptor (forwarded via the library's prop).
- The grip decoration rendered when `withHandle: true` is decorative
  (`aria-hidden`) because the handle's accessible name and value are
  already announced via the library's ARIA wiring.
- The library renders inline (no portal) so tests scan `container` with
  `axe`, not `document.body`.

## Do / Don't

- DO use bare numbers for percentage-based default layouts that should
  remain relative on resize, and CSS length strings (`'200px'`,
  `'12rem'`) when a panel should preserve its pixel size as the parent
  group resizes. DON'T mix the two without setting
  `groupResizeBehavior` on the panel descriptor — the library's default
  (`'preserve-relative-size'`) assumes percentage semantics.
- DO interleave a `{ type: 'handle' }` descriptor between every pair of
  adjacent panels you want to be independently resizable. DON'T place
  two adjacent handles or two adjacent panels — the library treats
  consecutive separators as collapsed and consecutive panels as
  unresizable.
- DO supply stable `id`s on panel descriptors when you plan to persist
  layouts via the library's `useDefaultLayout` hook. DON'T mutate the
  `id` between renders — the library uses it as the layout's primary
  key and a change destroys the saved state.
- DO toggle `withHandle: true` on dense layouts where the bare 1px bar
  is hard to discover. DO leave it off when adjacent panels already cue
  the resize edge (visible borders, contrasting backgrounds).
- DON'T pass `className` to Resizable, the panels, or the handles —
  there is no public escape hatch. If a styling knob is missing, add a
  variant axis.
- DON'T pass `orientation` directly — the prop is omitted at the type
  level because `direction` is the organism's vocabulary. Use
  `direction='vertical'` to flip the layout axis.
