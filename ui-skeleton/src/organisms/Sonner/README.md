# Sonner

Global toast host that wraps `sonner`'s `<Toaster />` once at the app root and
exposes a re-exported `toast` helper so consumers fire toasts through the
package barrel rather than importing `sonner` directly. Unlike every other
portal-based organism in this layer, Sonner has no `trigger` slot — there is
nothing to open. The Toaster listens to the imperative `toast(...)` calls
that fire from anywhere in the React tree.

## Import

```ts
import { Sonner, toast } from '@open-tomato/ui-skeleton';
```

## Toast-firing pattern

Mount `<Sonner />` once at the app root (typically inside the providers
tree). Anywhere in the rest of the React tree, import `toast` from the
package barrel and call it imperatively — no React context lookup, no
trigger element required:

```tsx
// At the app root:
<Sonner position="top-right" richColors closeButton />

// Anywhere in the tree:
import { toast } from '@open-tomato/ui-skeleton';

toast('Saved.');
toast.success('Profile updated.');
toast.info('Heads up.');
toast.warning('Storage almost full.');
toast.error('Could not connect.');

// Promise lifecycle — sonner resolves the toast through loading → success/error:
toast.promise(saveDraft(), {
  loading: 'Saving draft…',
  success: (id) => `Saved as ${id}.`,
  error: 'Could not save.',
});

// Dismiss programmatically:
const id = toast('Long-running…', { duration: Infinity });
toast.dismiss(id);
```

The `toast` helper is the same singleton sonner ships — it queues until a
Toaster mounts and flushes on first render. Multiple `<Sonner />` instances
share the queue, so mount exactly one at the app root.

## Props

| Prop          | Type                                                                                                                | Default          |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| position      | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'`                  | `'bottom-right'` |
| richColors    | `boolean`                                                                                                           | `false`          |
| expand        | `boolean`                                                                                                           | `false`          |
| closeButton   | `boolean`                                                                                                           | `false`          |
| theme / dir / hotkey / duration / gap / visibleToasts / offset / mobileOffset / icons / toastOptions / ...          | Forwarded to sonner `Toaster`                                                                                       | —                |

`className` is not a public prop — styling is controlled exclusively through
`position`, `richColors`, `expand`, and `closeButton`. Per-toast styling is
sonner's domain; pass `toastOptions` (an object accepted by the underlying
Toaster) to set Toaster-wide defaults if needed.

## Variants

| position           | sonner `data-y-position` / `data-x-position` |
| ------------------ | -------------------------------------------- |
| `top-left`         | `top` / `left`                               |
| `top-center`       | `top` / `center`                             |
| `top-right`        | `top` / `right`                              |
| `bottom-left`      | `bottom` / `left`                            |
| `bottom-center`    | `bottom` / `center`                          |
| `bottom-right`     | `bottom` / `right` (default)                 |

`richColors`, `expand`, and `closeButton` are pure passthroughs to the
matching Toaster props — no organism-side styling consequence; sonner
applies the visual treatment when it renders each toast.

**Position deviation.** sonner ships six positions
(`top-{left,center,right}` + `bottom-{left,center,right}`); the organism
mirrors the library. There is no middle-row anchor — adding one would
type-check at the boundary but break at runtime inside the Toaster.

## Composition

- **Wrapped library:** `sonner` provides the `<Toaster />` host (a
  `<section data-sonner-toaster>` that owns positioning, theming,
  animation, and per-toast styling) plus the imperative `toast(...)` helper
  family (`toast`, `toast.success`, `toast.info`, `toast.warning`,
  `toast.error`, `toast.promise`, `toast.message`, `toast.custom`,
  `toast.loading`, `toast.dismiss`, `toast.getHistory`, `toast.getToasts`).
  The organism composes only the Toaster — the toast helpers are
  re-exported as-is so consumers never reach into `sonner` directly.
- **No `trigger` slot.** Sonner is the only portal-based organism without
  a trigger. The toast queue is a global singleton; firing happens via
  imperative calls, not by clicking a wrapped element.
- **No `className` flows downward.** The organism does not expose
  `className` on the Toaster — `className` is `Omit`'d from the public
  props interface. If a styling knob is missing, add a variant axis on the
  organism.
- **Variant propagation by direct passthrough.** Each axis maps 1:1 to a
  Toaster prop:

  ```ts
  // organism axis        → sonner Toaster prop
  position                → position
  richColors              → richColors
  expand                  → expand
  closeButton             → closeButton
  ```

  No lookup table is needed because the organism's vocabulary already
  matches the library's. The defaults (`position: 'bottom-right'`,
  `richColors: false`, `expand: false`, `closeButton: false`) are applied
  explicitly inside the organism rather than relying on sonner's defaults,
  so consumer-supplied `undefined` collapses to a known value.
- **Single-instance contract.** Mount exactly one `<Sonner />` at the app
  root. Multiple instances share sonner's singleton queue and will all
  receive every fired toast, which causes duplicates and visual noise.
- **Layer-import direction.** Imports `sonner` only. Does NOT import other
  organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The Toaster section renders with `aria-live="polite"` by default so
  screen readers announce toasts without interrupting the user. Pass
  `containerAriaLabel` through the rest props to override the default
  accessible name ("Notifications").
- Each toast carries `data-sonner-toast`, `data-type` (`success` /
  `info` / `warning` / `error` / `loading` / `default`), and (when
  `richColors` is true) `data-rich-colors="true"` for downstream styling
  and test queries.
- The per-toast close button renders only when `closeButton` is enabled
  globally OR when an individual toast opts in via `toast(message, {
  closeButton: true })`. Its accessible name comes from
  `closeButtonAriaLabel` on the underlying Toaster's `toastOptions` (the
  sonner default is `"Close toast"`).
- Tests MUST call `await axe(document.body)` rather than
  `await axe(container)` — the Toaster section and any fired toasts can
  leak outside the bound render container.
- The `region` axe rule is disabled in the organism's own tests because
  sonner's section uses an `aria-label` rather than a landmark role and
  the rule's region semantics do not apply.

## Do / Don't

- DO mount exactly one `<Sonner />` at the app root. DON'T mount multiple
  instances — sonner's queue is a singleton and every Toaster receives
  every fired toast, producing duplicates.
- DO call `toast(...)` from anywhere in the React tree (event handlers,
  effects, async resolvers). DO use `toast.promise(...)` for async work
  so the toast lifecycle (`loading → success/error`) is wired
  automatically.
- DO import `toast` from `@open-tomato/ui-skeleton` rather than from
  `sonner`. DON'T reach past the organism into the underlying library —
  the re-export keeps the public API swappable.
- DO use `closeButton` globally for consumer-dismissible toasts, OR opt
  in per-toast via the `closeButton` field on individual `toast(...)`
  calls. DON'T leave long-lived toasts (`duration: Infinity`) without a
  dismiss affordance.
- DON'T pass `className` to Sonner; there is no public escape hatch. If
  a styling knob is missing, add a variant axis.
- DON'T expose a `middle-*` position. sonner ships six positions only;
  adding a fourth row would type-check at the organism boundary and
  break at runtime when the Toaster receives an invalid value.
