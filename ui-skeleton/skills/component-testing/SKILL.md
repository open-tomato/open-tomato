---
name: component-testing
description: Use when writing a *.test.tsx file, debugging a Vitest run, hitting a jsdom limitation, configuring vitest.config.ts or vitest.setup.ts, or running into a test-id, role-query, or a11y assertion that fails for non-obvious reasons.
---

# Component Testing

This skill covers the test side of the six-file convention. Each atom ships a `<Component>.test.tsx` with at minimum:

1. Renders children (or the configured slot content).
2. Applies a variant class for at least one non-default variant.
3. No a11y violations (`await axe(container)`).

For the file convention, see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).

## Stack

- **Vitest 4** — test runner.
- **@testing-library/react 16** — React 19 compatible component testing.
- **@testing-library/jest-dom 6** — DOM matchers, registered in `vitest.setup.ts`.
- **@testing-library/user-event 14** — user interaction simulation.
- **jest-axe 10** + `@types/jest-axe@^3` — automated a11y assertions. (The types package lags behind the runtime in major version — that's expected, don't try to "fix" it.)
- **jsdom 29** — DOM environment.
- **@vitest/coverage-v8** — coverage reporting at the same major as Vitest.

## Coverage thresholds

Per-package, not per-file:

- 80% lines
- 80% statements
- 75% branches
- 80% functions

Run with `bun run test:coverage` for the HTML report + summary.

## The `bun test` vs `bun run test` trap (CRITICAL)

`bun test` is Bun's built-in test runner and does **NOT** honor the project's Vitest config — no jsdom, no setup file, no `vi` global. Invoking `bun test <path>` directly errors with `ReferenceError: document is not defined` and `prepareDocument` failures from `@testing-library/user-event`.

**Always** run package tests through:

- `bun run test` — which executes the package script `vitest run`.
- `bunx vitest run` — direct Vitest invocation with the same effect.
- `bun run test:watch` — watch mode.
- `bun run test:coverage` — with coverage.

Same trap applies to any `bun test ...` shorthand. Only the script form (`bun run`) goes through Vitest.

## Vitest config — use `mergeConfig` from `vitest/config`

Layer Vitest options onto the shared Vite config via `mergeConfig` so plugins, the `@` alias, and externals are preserved:

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: false, // import { test, expect } explicitly
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        thresholds: {
          lines: 80, statements: 80, branches: 75, functions: 80,
        },
      },
    },
  }),
);
```

**Important:** import `mergeConfig` from `vitest/config`, NOT from `vite`. Importing from `vite` skips the Vitest-aware merge logic.

Import the vite config as a default export. Vitest accepts it as an object even though the file exports `defineConfig(...)` from `vite`.

## `vitest.setup.ts` — what belongs here

```ts
/* global globalThis */
import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jsdom doesn't implement ResizeObserver; Radix primitives that observe size
// (ScrollArea, Slider, ...) throw at render without this polyfill.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  } as unknown as typeof ResizeObserver;
}

// Radix Select / Listbox / Combobox primitives call these on focused items
// when the listbox opens or while pointer interactions move between items.
// jsdom implements none of them — the missing-method TypeError fires inside
// a commit-phase effect, unmounts the test render mid-frame, and downstream
// queries fail with confusing `root.getElementById is not a function` errors
// from `dom-accessibility-api`. Polyfill as no-ops.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
}

// vaul (Drawer organism) and any other gesture/breakpoint-aware library
// calls `window.matchMedia(...)` on mount to detect reduced-motion /
// pointer-coarse preferences. jsdom doesn't implement it; the missing
// function throws inside the commit-phase effect when the Drawer's
// Content first opens. Stub it as a media-query-shaped no-op so the mount
// path completes.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
```

Required for any Select / Combobox / Listbox-style portaled menu. Popover / Tooltip / HoverCard / ContextMenu do NOT need these polyfills because they don't scroll-into-view their content. The `matchMedia` polyfill is required for any `vaul`-based organism (Drawer) and any library that branches on `prefers-reduced-motion` or `pointer: coarse` at mount.

### Why the `/* global globalThis */` comment

The shared ESLint config does not include `globalThis` in its globals. Add `/* global globalThis */` at the top of `vitest.setup.ts` (or other setup files) to suppress `no-undef` without disabling the rule package-wide.

Same trick applies to any other setup file that needs `globalThis`.

## jsdom limitations and workarounds

jsdom doesn't implement layout. Any Radix primitive that observes its own size (`ScrollArea`, `Slider`, `Toast`, positioned `Tooltip` content, etc.) will throw `ReferenceError: ResizeObserver is not defined` at render time without the polyfill in `vitest.setup.ts`.

The polyfill is broadly safe because the primitives only use the observer for measurement-driven visual state, which jsdom can't compute anyway.

### `ScrollArea` `type="hover"` defaults to layout-gated mounting

Radix `ScrollAreaScrollbar` defaults to `type="hover"`, which only mounts the scrollbar after the auto-detect logic (`ScrollAreaScrollbarAuto`) measures overflow on its axis. jsdom can't measure layout, so only the axis that happens to satisfy Radix's overflow-detection short-circuit will mount — in practice that's vertical only.

**To exercise both scrollbars in tests:** pass `type="always"` so Radix uses `ScrollAreaScrollbarAlways` (unconditional mount).

Same trap likely applies to any Radix primitive whose mount logic is gated on layout-derived state (`Popover` collision detection, `Dropdown` positioning, etc.). When tests need the inner element regardless of layout, look for an `always` / `forceMount` escape hatch on the primitive.

### Mocking `scrollHeight` for autoResize testing

jsdom returns `0` for `scrollHeight` by default (no layout). For testing autoResize behavior (Textarea, contenteditable, etc.), mock the element's `scrollHeight` via `Object.defineProperty` BEFORE triggering the change/typing:

```ts
const textarea = screen.getByRole('textbox');
Object.defineProperty(textarea, 'scrollHeight', {
  configurable: true,
  value: 200,
});
await user.type(textarea, 'multi\nline\ntext');
expect(textarea).toHaveStyle({ height: '200px' });
```

Without the mock, the test only asserts that `style.height` was set to `'0px'`, which is a weak signal. With the mock, the test verifies the full read-then-write loop.

### Don't assert Radix-gated DOM in tests

For multi-part wrappers where a sub-element (e.g. ScrollArea's `Corner`) is conditionally mounted **by Radix itself** based on runtime layout (not by the wrapper's render branch), assert only the wrapper-controlled branches and document the Radix-gated behavior.

Don't assert the corner/sub-element's DOM presence; jsdom can't satisfy Radix's gating conditions and you'll get a flaky-looking test. The wrapper's responsibility is "emit the right JSX"; Radix decides whether to mount.

## Testing inline styles

`toHaveStyle({ transform: 'translateX(-60%)' })` from jest-dom works in jsdom for asserting inline-style props on rendered elements — useful when the visual state of a wrapper (Progress indicator width, Slider range fill, etc.) lives in `style` rather than `className`.

Match the exact CSS string Radix / JSX emits. jsdom doesn't normalize `translateX(0%)` vs `translateX(-0%)`, so write the expected string in the same form the component produces.

## Testing Library traps

### Accessible-name matching is exact by default

`getByRole('button', { name: 'X' })` is **exact-match by default**. When `leadingIcon` / `trailingIcon` text content is part of the rendered tree, the accessible name becomes `"L X"` (icon + text) and an exact `'X'` lookup fails.

**Fix:** use a regex (`/X/`) or `{ exact: false }` when icons live inside the actionable element.

Hidden icons (`aria-hidden`) are still counted by the accName algorithm if they contain text content — only non-text glyphs are skipped.

### `<label>` association in tests

`jsx-a11y/label-has-associated-control` is a **static-analysis** rule and does NOT see through custom components. `<label><Input/></label>` errors at lint time even though `<Input>` does render an `<input>` at runtime.

In tests and stories, prefer the `htmlFor` / `id` pairing over JSX nesting:

```tsx
// Lint-friendly:
<label htmlFor="email">Email</label>
<Input id="email" />

// Lint-hostile (even though it works at runtime):
<label>Email<Input /></label>
```

The runtime label association works either way.

## Required assertions per atom (the three-assertion minimum)

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, test, expect } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  test('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  test('applies variant class for non-default variant', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });

  test('has no a11y violations', async () => {
    const { container } = render(<Button>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Add additional tests for atom-specific concerns:

- Loading state combos (`toBeDisabled()`, `toHaveAttribute('data-loading', '')`, `toHaveAttribute('aria-busy', 'true')`).
- `asChild` polymorphism (renders as `<a>` when given an anchor child).
- Slot rendering (header / footer presence/absence via `data-slot` queries).
- Controlled vs. uncontrolled state transitions.

## Running tests during scaffolding

`bunx vitest run` returns exit 1 with `No test files found` when the package has no `*.test.*` files yet — this is **normal** during scaffolding, not a config failure. Confirms the config loaded and resolved successfully.

Same applies to `tsc --noEmit` on an empty package: TS18003 (`No inputs were found`) is expected during scaffolding and goes away once source files exist.

## Portal-based molecules — query with `screen.findByRole`

Radix Popover, Tooltip, HoverCard, ContextMenu, and Select all render their Content into a `RadixPortal` that targets `document.body` — OUTSIDE the test's bound `container`. `getByRole(...)` against the destructured `container` misses portaled content and throws. The fix:

- Use `screen.findByRole(...)` (the `screen.find*` family searches `document.body` and awaits async open).
- For Tooltip specifically, pass `delayDuration={0}` on the molecule prop so the 300ms hover delay doesn't race the awaited query.
- `data-side` / `data-align` emitted by Radix after collision detection are queryable AFTER the `findByRole` resolves — molecule axes are the consumer's REQUEST; the resolved value may differ if there's no room.

## Tooltip's visually-hidden a11y twin (duplicate text rendering)

Radix Tooltip renders its body content TWICE in the DOM when open:

1. Inside the visible `[data-slot=tooltip-content]` div.
2. Inside a nested visually-hidden `<span role="tooltip">` used as the `aria-describedby` target.

`screen.findByText('...')` collides with both copies and throws "Found multiple elements". Scope queries:

```ts
const visibleContent = await waitFor(() =>
  document.querySelector('[data-slot="tooltip-content"]') as HTMLElement,
);
const text = within(visibleContent).getAllByText('Save')[0];
```

Same gotcha applies to any future Radix wrapper that emits a visually-hidden a11y twin.

## axe `region` rule for portaled content

axe's `region` rule fails on Tooltip a11y tests because Radix portals the Content to `document.body` — OUTSIDE any `<main>` landmark the test wraps the render in. `role="dialog"` (Popover) is auto-exempted by axe so Popover passes naturally; `role="tooltip"` is NOT exempted.

For component-isolation tests, disable the rule per-test:

```ts
const results = await axe(baseElement, { rules: { region: { enabled: false } } });
expect(results).toHaveNoViolations();
```

The consumer's app shell provides the landmark in real usage — the portaled tooltip sitting above page flow is by design.

## Roving-focus keyboard navigation — drive directly, don't tab

Radix composite widgets that wrap a `RovingFocusGroup` (Menubar, NavigationMenu, Tabs, Toolbar, ToggleGroup, RadioGroup) expose a SINGLE tab stop and use Arrow keys to move between siblings. `userEvent.tab()` skips between widgets, not within them — testing internal navigation requires programmatic focus + raw keyboard events:

```ts
const triggers = screen.getAllByRole('menuitem'); // or 'tab', 'radio', etc.
const first = triggers[0]!;
const second = triggers[1]!;

first.focus();
await user.keyboard('{ArrowRight}'); // ArrowLeft to reverse; ArrowDown/ArrowUp for vertical orientation
expect(second).toHaveFocus();

await user.keyboard('{End}');   // last enabled member
await user.keyboard('{Home}');  // first enabled member
```

Notes:

- The destructured `[a, b, c] = getAllByRole(...)` is typed `HTMLElement | undefined` under `noUncheckedIndexedAccess`. Either use `triggers[i]!` non-null assertions or assert `triggers.length`.
- Radix `loop` defaults to `false` on most primitives — pressing ArrowRight on the last trigger stays put unless the consumer opted in. Test the loop behaviour explicitly if it matters.
- Disabled members are skipped by the roving-focus group; assert the next ENABLED sibling, not the next DOM sibling.
- `Home` / `End` jump to the first / last ENABLED member.

## Vitest reporter caveat

Avoid `--reporter=basic` for Vitest 4 smoke tests. It tries to resolve `basic` as a custom reporter module and crashes. Use the default reporter (no flag) for config-load checks.
