# Direction

Pure context wrapper around `@radix-ui/react-direction`'s `DirectionProvider`.
Surfaces `dir: 'ltr' | 'rtl'` to every Radix primitive in the descendant tree
so directional affordances flip without per-primitive configuration. Renders
no DOM beyond `children` — providers expose context, not visual output.

## Import

```ts
import { Direction } from '@open-tomato/ui-skeleton';
```

Consumers read the direction value via the wrapped library's hook:

```ts
import { useDirection } from '@radix-ui/react-direction';
```

The package does not re-export `useDirection`; it lives in
`@radix-ui/react-direction` and is the official read-side contract.

## Props

| Prop     | Type                | Default | Notes                                          |
| -------- | ------------------- | ------- | ---------------------------------------------- |
| dir      | `'ltr' \| 'rtl'`    | `'ltr'` | Layout direction propagated to descendants.    |
| children | `React.ReactNode`   | —       | Subtree that receives the direction context.   |

`className` is not a public prop — providers have no rendered element to apply
a class to. There are no variant axes; the only public knob is the wrapped
library's scalar `dir` union.

## Effect on descendants

Direction populates a single React context that the Radix primitives consume
internally. The visible effect on consumer-facing components when `dir="rtl"`
is mounted above them:

- **Popover / HoverCard / Tooltip Content** — `side` resolves to the
  visually-opposite axis. `side="start"` anchors right of the trigger;
  `side="end"` anchors left. Collision detection runs against the flipped
  axis. Same flip applies to NavigationMenu's viewport and any other
  Popper-based Radix primitive.
- **Slider** — thumb travel direction flips. Increasing the value moves the
  thumb leftward instead of rightward; arrow-key navigation respects the
  flipped axis (Right arrow decreases, Left arrow increases).
- **ContextMenu / DropdownMenu / Menubar SubMenu** — submenu trigger
  alignment flips. Submenus open on the left of their parent item instead of
  the right; nested menu keyboard navigation (Right opens, Left closes)
  mirrors the layout direction.
- **NavigationMenu** — indicator and viewport position flips along the
  horizontal axis.
- **Tabs (vertical orientation)** — keyboard navigation respects the
  direction context; horizontal-orientation Tabs are unaffected.

Atoms and molecules outside Radix (Typography, Card, Button) are unaffected
by Direction context. They inherit text direction from the document's
`dir` attribute, not from React context. See the **Accessibility** section
below for the implication.

## Mounting

Mount once near the root of the consuming app, outside every template /
organism / molecule / atom that should observe the direction.

```tsx
import { Direction } from '@open-tomato/ui-skeleton';

export function AppShell({ locale, children }: { locale: 'en' | 'ar'; children: React.ReactNode }): React.JSX.Element {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>
        <Direction dir={dir}>{children}</Direction>
      </body>
    </html>
  );
}
```

Note the **dual concern**: the consuming app sets `<html dir>` for native
text directionality (plain markup, form controls, CSS `direction:` cascade)
AND mounts `<Direction>` for Radix primitives. The provider is responsible
for Radix context only; setting `<html dir>` is an app-level concern.

## Accessibility

- Direction does NOT set the `dir` attribute on the HTML root. Radix
  primitives consume the value via context only. Text content, form
  controls, and any CSS that relies on the `direction:` property fall back
  to whatever the document's `dir` attribute is set to. For full RTL
  support, set `<html dir="rtl">` (or `<body dir="rtl">` for a scoped
  subtree) in the consuming app alongside the `Direction` mount.
- Mismatching the provider's `dir` and the document's `dir` leads to
  subtle layout bugs (Radix flips, plain markup does not). Keep both in
  sync. Typically a single locale-derived value drives both.
- Direction has no ARIA role and no focus-management implications of its
  own — it renders no DOM. Accessibility concerns flow through the
  individual Radix primitives the descendants compose.

## Do / Don't

- DO mount Direction once near the root of the consuming app, outside
  every template / organism that should observe the context.
- DO keep `<Direction dir>` and the document's `<html dir>` in sync.
- DO read the value via `useDirection()` from `@radix-ui/react-direction`
  inside any custom component that needs to respect direction. The hook
  works regardless of whether a `Direction` provider is mounted — it
  falls back to `'ltr'` when no provider is present, so it is always safe
  to call.
- DON'T mount Direction more than once in the same subtree. Nested
  providers shadow each other; the innermost one wins. There is no
  legitimate use for a nested Direction.
- DON'T expect Direction to set `<html dir>` for you. It only populates
  Radix's React context; document-level direction is the app's concern.
- DON'T pass anything other than `'ltr'` or `'rtl'` to `dir`. The union
  is exhaustive; TypeScript rejects other strings at compile time and
  Radix throws on other runtime values.
