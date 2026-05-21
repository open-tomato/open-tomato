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
```

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

## Vitest reporter caveat

Avoid `--reporter=basic` for Vitest 4 smoke tests. It tries to resolve `basic` as a custom reporter module and crashes. Use the default reporter (no flag) for config-load checks.
