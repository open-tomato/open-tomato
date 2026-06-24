---
title: "Styling Skill"
description: "Open Tomato-specific shadcn/radix/tailwind conventions, @open-tomato/react component patterns, and design system token usage."
---

# Styling Skill

## Overview

This skill documents **Open Tomato-specific** styling patterns only. Every rule here answers "no" to:

> "Would this rule apply to a generic React project not using shadcn, radix, tailwind, or `@open-tomato/react`?"

Generic React advice (hooks, state management, component lifecycle) is intentionally excluded and deferred to the ECC baseline. For UI component authoring, also see `@open-tomato/ui` (`packages/ui-ad-hoc`).

---

## shadcn/radix/tailwind Conventions

### Project Configuration

- **Style**: `radix-nova` (not the shadcn default `default` style)
- **Base color**: `neutral`
- **CSS variables**: enabled
- **Icon library**: `remixicon` / `@remixicon/react` — **not** lucide-react
- Component path aliases point to `@open-tomato/ui/*` sub-paths (see `components.json`)
- Shared `globals.css` lives in `packages/ui-ad-hoc/src/styles/globals.css` — apps do **not** have their own

### Tailwind v4 Setup

This project uses Tailwind v4. There is **no** `tailwind.config.ts`.

- Configuration lives entirely in `globals.css` via `@import "tailwindcss"`, `@theme inline {}`, `@custom-variant dark`, and `@source` directives
- Uses `@tailwindcss/postcss` plugin in `postcss.config.mjs`
- `tw-animate-css` is imported here (not `tailwindcss-animate`) — provides `animate-in`, `animate-out`, `fade-in-0`, `zoom-out-95`, etc.
- `shadcn/tailwind.css` is also imported alongside Tailwind v4's own imports

### Radix Import Pattern

There are two import patterns in use — follow the one appropriate to the package:

```ts
// packages/ui-ad-hoc (shared components) — preferred for new shared components
import { Slot } from 'radix-ui'

// apps/dashboard and app-level components — legacy pattern, do not propagate
import { DialogRoot } from '@radix-ui/react-dialog'
```

New shared components must use the bare `radix-ui` package (ui-ad-hoc pattern).

### cn() Import Sources

```ts
// Shared packages and ui-ad-hoc components
import { cn } from '@open-tomato/ui/lib/utils'

// App-local components
import { cn } from '@/lib/utils'
```

Both are `twMerge(clsx(inputs))` — identical implementations.

### CVA Canonical Usage

```ts
import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap ...',
  {
    variants: {
      variant: { default: '...', destructive: '...' },
      size: { sm: '...', md: '...' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)
```

- Base classes in the first argument (long string)
- `variants` and `defaultVariants` in the second argument
- Export as `buttonVariants`, `badgeVariants`, etc. for external reuse
- `asChild` prop uses `Slot.Root` from `radix-ui` for polymorphic rendering

### Manual Variant Map (Alternative to CVA)

Use a `Record<Variant, string>` map instead of CVA when variants are data-driven (dynamic type strings) rather than design-system variants:

```ts
const variantClasses: Record<PillVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  skill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}
```

### Compound Component Pattern (shadcn-style)

- Wrap Radix primitives and re-export as named compound members
- Set `displayName` on each sub-component for DevTools debugging
- Use `forwardRef` on all components that accept a DOM ref

```ts
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName
DialogContent.displayName = DialogPrimitive.Content.displayName
```

### data-* Attribute Conventions

```text
data-slot       — identifies component role within a compound (e.g. data-slot="dialog-overlay")
data-variant    — mirrors CVA variant prop for CSS targeting
data-size       — mirrors CVA size prop for CSS targeting
```

Used in Tailwind selectors via `data-[slot=X]:` modifier.

### Animation Pattern

- `data-[state=open]:animate-in data-[state=closed]:animate-out` — Radix state drives tw-animate-css
- Overlay: `fade-in-0` / `fade-out-0` only (no movement)
- Dialog content: `fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]`
- All animation classes come from `tw-animate-css` — not `tailwindcss-animate`

---

## `@open-tomato/react` Component Library Patterns

> `@open-tomato/react` is the **micro-app runtime/platform library**, not a UI component library. UI components live in `@open-tomato/ui` (`packages/ui-ad-hoc`).

### Styling-Relevant Exports

```ts
import { useTheme, useColorScheme } from '@open-tomato/react'
import type { ThemeValue, ColorScheme } from '@open-tomato/react'
```

| Hook | Returns | When to use |
|------|---------|-------------|
| `useTheme()` | `{ theme: ThemeValue, setTheme }` | Theme toggle UI (read + write) |
| `useColorScheme()` | `ColorScheme = 'light' \| 'dark'` | Conditional asset/image rendering; always resolves to a concrete value |

- `ThemeValue = 'light' | 'dark' | 'system'`
- `useColorScheme()` resolves `'system'` via `window.matchMedia`; SSR-safe (falls back to `'light'`)
- Never use `next-themes` directly — it is an implementation detail wrapped by `ThemeProvider`

### Theme Hook Rules

```ts
// CORRECT — use typed hook
const { theme, setTheme } = useTheme()
setTheme('dark')

// WRONG — never toggle manually
document.documentElement.classList.add('dark')
```

- `ThemeProvider` is mounted automatically by `createApp` — **never** add it manually
- `next-themes` is an internal implementation detail — never import it directly in app code

### App Bootstrapping (createApp)

```ts
// Main app (full shell: nav, analytics, cookie consent)
const App = createApp({ shell: 'main', theme: { defaultMode: 'system' }, routes })

// Micro-app (embedded — inherits shell's providers)
const App = createApp({ shell: 'micro', routes })
```

- `createApp(config)` is the only supported bootstrap pattern
- Config validated via Zod synchronously at factory time — misconfigurations throw before render
- Micro-apps must NOT add their own layout wrappers — they inherit shell layout

### Micro-App Dual-Export Contract

All micro-apps must export both:

```ts
// Default export — enables standalone `vite dev`
export default createApp({ shell: 'micro', routes })

// Named export — consumed by shell via lazy import
export { routes }
```

Shell types the lazy import as `Promise<MicroAppModule>` from `@open-tomato/react`.

### Singleton Constraint

- `@open-tomato/react` must load exactly once per JS environment
- Enforced via a `globalThis` symbol flag — throws if loaded twice
- Mark `@open-tomato/react` as `external` in each micro-app's Vite config
- In packages consumed as libraries, declare it as `peerDependencies`, not `dependencies`

### Shell Layout CSS Seams

```text
<div className="ot-layout">
  <main className="ot-content">
    {/* micro-app content renders here */}
  </main>
</div>
```

- `ot-layout` and `ot-content` are only present in the `shell: 'main'` branch
- Micro-apps must not add their own layout wrappers — these classes are the seam points for global layout styles

### AppErrorBoundary (Composing Error Fallback UI)

`AppErrorBoundary` is the only UI component exported from `@open-tomato/react`. It is unstyled — the fallback UI is fully caller-supplied.

```tsx
import { AppErrorBoundary } from '@open-tomato/react'

// With a styled fallback (use tokens, not hardcoded colors)
<AppErrorBoundary
  fallback={
    <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
      <p>Something went wrong.</p>
    </div>
  }
>
  <MyFeature />
</AppErrorBoundary>

// Fallback-free — renders null on error, still reports to ErrorContext
<AppErrorBoundary>
  <MyOptionalWidget />
</AppErrorBoundary>
```

- Use for section/widget-level isolation within a micro-app route (not for full-page errors — the shell already wraps the entire tree)
- Captured errors propagate to the registered error handler via `ErrorContext` automatically
- Fallback must use design tokens if it contains any color or typography — no hardcoded values

### Extending the Provider Stack (AppPlugin)

`AppPlugin` wraps the built-in provider stack from outside. Use only when a feature requires its own provider above all built-in layers (e.g., an A/B testing provider that controls visual variants before routing resolves).

```ts
import type { AppPlugin } from '@open-tomato/react'

const myPlugin: AppPlugin = (tree, config) => (
  <MyProvider appId={config.appId}>{tree}</MyProvider>
)

const App = createApp({
  shell: 'main',
  appId: 'my-app',
  routes,
  plugins: [myPlugin],
})
```

- `plugins[0]` becomes the **outermost** wrapper; subsequent plugins wrap inward
- Plugin receives `ResolvedAppConfig` — use `config.appId`, `config.shell`, `config.env`
- Do not add `ThemeProvider` as a plugin — it is already in the built-in stack
- Prefer CSS custom properties and design tokens over plugin-level style injection

### Provider Stack Order

For reference when building components that consume context or debugging provider scope:

```text
plugins[0] (outermost, if any)
  plugins[1] ...
    ErrorBoundary
      ThemeProvider        ← useTheme() / useColorScheme() available here and below
        LoggerProvider
          QueryProvider
            AuthProvider
              FeatureFlagProvider
                AppContextProvider
                  ShellOnlyProviders  ← ot-layout / ot-content (shell: 'main' only)
                    RouterProvider    ← route components render here
```

`ThemeProvider` wraps the auth and data layers, so `useTheme()` is always safe to call inside any route component without hoisting.

### What `@open-tomato/react` Does NOT Provide

| Need | Use instead |
|------|-------------|
| UI components (buttons, dialogs, etc.) | `@open-tomato/ui` / `packages/ui-ad-hoc` |
| Design tokens / CSS variables | `packages/ui-ad-hoc/src/styles/globals.css` |
| Tailwind utilities, CVA, cn | `@open-tomato/ui/lib/utils` or `@/lib/utils` |

---

## Design System Token Usage

### Token Source of Truth

All design tokens live in `packages/ui-ad-hoc/src/styles/globals.css`. Apps must import this file — they do not maintain their own token files.

The `@theme inline {}` block bridges CSS custom properties to Tailwind utilities:

```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* ... */
}
```

### Token Naming Conventions

All design tokens follow a consistent naming scheme derived from the shadcn `radix-nova` style but with project-specific extensions:

**Role-based suffix pattern:**

```text
--{role}                  surface or primary color (e.g. --primary, --muted, --background)
--{role}-foreground       text rendered on top of that surface (e.g. --primary-foreground)
```

Never use a `-foreground` token on a surface that isn't its paired role token. For example, `text-primary-foreground` is only correct inside `bg-primary` elements.

**Functional token names (no foreground pair):**

```text
--border     dividers and outlines
--input      form control borders
--ring       focus ring color
```

**Extended family pattern (sidebar, chart):**

```text
--{family}                    base surface  (e.g. --sidebar)
--{family}-foreground         text on base  (e.g. --sidebar-foreground)
--{family}-primary            accent within family
--{family}-primary-foreground text on accent
--{family}-accent             secondary accent
--{family}-accent-foreground  text on secondary accent
--{family}-border             divider within family scope
--{family}-ring               focus ring within family scope
```

**Scale/index tokens (chart only):**

```text
--chart-1 through --chart-5   ordered from light to dark (oklch hue ~277)
```

**Radius token scale (computed from base):**

```text
--radius           base value (0.45rem — all others derive from this)
--radius-{step}    named steps: sm, md, lg, xl, 2xl, 3xl, 4xl
```

**Override rule for dark mode:**
Dark mode tokens live in a `.dark {}` block that overrides `:root`. Semi-transparent values (e.g. `oklch(1 0 0 / 10%)`) replace explicit OKLCH values for `--border` and `--input` in dark mode to produce white-with-opacity borders instead of hardcoded dark grays.

---

### Color System (oklch + CSS Custom Properties)

All tokens use `oklch()` color space in `:root`:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --input: oklch(0.922 0 0);
}

.dark {
  /* Override block — --border and --input use white with opacity */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
}
```

### Semantic Token Classes (Canonical)

```text
Primary:       bg-primary text-primary-foreground
Destructive:   bg-destructive/10 text-destructive
Muted text:    text-muted-foreground
Borders:       border-border
Surfaces:      bg-background, bg-muted
Focus rings:   focus:ring-2 focus:ring-ring/50 focus:border-ring
Base layer:    * { @apply border-border outline-ring/50; }
               body { @apply bg-background text-foreground; }
```

**Never use hardcoded color utilities** (`bg-blue-600`, `text-green-500`) in shared component code. Use semantic tokens.

### Extended Token Families (radix-nova specific)

**Chart scale** — for data visualization only, never general UI:

```text
bg-chart-1 through bg-chart-5
text-chart-1 through text-chart-5
```

**Sidebar family**:

```text
bg-sidebar            text-sidebar-foreground
bg-sidebar-primary    text-sidebar-primary-foreground
bg-sidebar-accent     text-sidebar-accent-foreground
border-sidebar-border ring-sidebar-ring
```

### Radius Token Scale

Base: `--radius: 0.45rem` (project-specific — not the shadcn default of `0.5rem`).

| CSS Variable | Multiplier | Approximate Value | Tailwind Class |
|---|---|---|---|
| `--radius-sm` | × 0.6 | ~0.27rem | `rounded-sm` |
| `--radius-md` | × 0.8 | ~0.36rem | `rounded-md` |
| `--radius-lg` | × 1.0 | 0.45rem | `rounded-lg` |
| `--radius-xl` | × 1.4 | ~0.63rem | `rounded-xl` |
| `--radius-2xl` | × 1.8 | ~0.81rem | `rounded-2xl` |
| `--radius-3xl` | × 2.2 | ~0.99rem | `rounded-3xl` |
| `--radius-4xl` | × 2.6 | ~1.17rem | `rounded-4xl` |

Radius clamping for small button sizes:

```text
rounded-[min(var(--radius-md),10px)]   xs/sm buttons
rounded-[min(var(--radius-md),12px)]   sm button variant
```

Pattern: `min(token-value, absolute-max)` — prevents rounding from exceeding half the element height.

### Opacity Modifier Conventions

```text
/10    Soft tinted backgrounds:   bg-destructive/10
/20    Hover tints:               hover:bg-destructive/20, aria-invalid:ring-destructive/20
/30–/50  Increasing opacity steps on semantic tokens
/50    Canonical focus ring:      ring-ring/50
/50    Modal overlays:            bg-black/50  (hardcoded — acceptable for overlays only)
/40    Dark category pills:       dark:bg-blue-900/40  (established pattern)
```

### Focus Ring Pattern

```text
Form controls (input, select, textarea):
  focus:ring-2 focus:ring-ring/50 focus:border-ring

Buttons:
  focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50

Destructive variant:
  focus-visible:border-destructive/40 focus-visible:ring-destructive/20

Dismiss/close controls:
  focus:ring-2 focus:ring-ring

Rule: outline-none must always accompany ring-* to avoid double outline
```

### ARIA-Driven Token Patterns

```text
Invalid state:
  aria-invalid:border-destructive
  aria-invalid:ring-3 aria-invalid:ring-destructive/20
  dark:aria-invalid:border-destructive/50
  dark:aria-invalid:ring-destructive/40

Expanded state:
  aria-expanded:bg-muted aria-expanded:text-foreground
```

### Dark Mode Patterns

```text
Outline buttons:  dark:border-input dark:bg-input/30 dark:hover:bg-input/50
Ghost hover:      dark:bg-muted/50
```

### Category/Status Color Convention (Pill — Explicit Exception)

Non-semantic palette colors are permitted **only** for content-type and status pills. Pattern:

```text
bg-{color}-100 text-{color}-700 dark:bg-{color}-900/40 dark:text-{color}-300
```

| Category | Color |
|---|---|
| skill | blue |
| guideline | purple |
| implementation | orange |
| tool | green |
| workflow | teal |
| fresh / active / true | emerald |
| updated | blue |
| stale | amber |
| deleted | red |
| default / inactive / false | muted (semantic) |

Pending state overlay: `opacity-60 ring-1 ring-current ring-dashed`

### Font Token

```css
/* @theme inline block — self-referential declaration */
--font-sans: var(--font-sans);
```

The consuming app's Next.js font loader (`next/font`) sets `--font-sans` as a CSS variable; this declaration makes it available as a design token. `font-mono` is not tokenized — it resolves to the browser's system monospace stack.

### Isolation: tech-tree App

`apps/tech-tree/src/index.css` uses a separate hex-based token system (`--bg`, `--bg2`, `--accent`, etc.) and does **not** import `globals.css`. It is a standalone developer tool. Do not reference tech-tree token names in shared component code.

---

## Project-Specific Component Structure Rules

### Build & Verification

`@open-tomato/ui` is a **source-only package** — it has no `build` script. Wildcard exports in `package.json` point directly to `.tsx`/`.ts` source files, so consumers compile the source themselves. Verify with `bun run typecheck` (`tsc --noEmit`), not `bun build`.

Tests use **vitest + jsdom + @testing-library/react**. Setup file at `tests/setup.ts`. Note: jsdom normalizes hex+alpha color values (e.g. `#ff000014`) to rgba format — use regex matchers or `toMatch` for inline style color assertions. Components expose `data-slot`, `data-variant`, `data-size` attributes that are useful for test selectors.

### Directory Layout

**Shared UI package (`packages/ui-ad-hoc` = `@open-tomato/ui`):**

```text
packages/ui-ad-hoc/
├── src/
│   ├── components/         # Flat — one .tsx file per component, no sub-directories
│   │   ├── button.tsx
│   │   ├── dialog.tsx      # Compound components also live in one flat file
│   │   ├── input.tsx
│   │   └── pill.tsx
│   ├── hooks/              # Shared hooks (use-*.ts pattern)
│   ├── lib/
│   │   └── utils.ts        # cn() utility
│   └── styles/
│       └── globals.css     # All design tokens and Tailwind config
├── components.json
└── package.json
```

**Next.js app (`apps/toolbox-ui`):**

```text
apps/toolbox-ui/
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── [route]/
│       ├── page.tsx
│       └── _components/        # Route-local components (prefixed with _)
│           └── route-view.tsx
├── src/
│   ├── components/             # App-shared components (flat, no sub-directories)
│   │   ├── app-nav.tsx
│   │   └── theme-provider.tsx
│   ├── hooks/                  # App-shared hooks
│   │   └── use-agents.ts
│   └── lib/
│       └── utils.ts            # Local cn() re-export
└── tsconfig.json
```

**Vite app (`apps/dashboard`):**

```text
apps/dashboard/src/
├── components/         # App-local flat components
│   ├── EventCard.tsx
│   └── ui/             # Shadcn-generated local variants (legacy — prefer @open-tomato/ui)
├── hooks/
├── lib/
├── store/
└── types.ts
```

### File Naming

```text
ComponentName.tsx       PascalCase — React components
use-something.ts        kebab-case — hooks (note: use-* prefix, dash-separated)
utils.ts                lowercase — utility modules
globals.css             lowercase — stylesheet files
```

**Note:** Hooks inside `packages/ui-ad-hoc/src/hooks/` use `hook.ts` (singular) as the filename — this is a one-off. App hooks follow `use-{feature}.ts` naming.

**Route-local components** use the Next.js App Router convention: `_components/` (underscore-prefixed directory) inside the route segment. This prevents the directory from being treated as a route.

### Co-location Rules

**Shared package components:**
- CVA variant definitions are co-located in the same `.tsx` file as the component — there are **no** separate `.styles.ts` files
- Compound component sub-parts (e.g. `DialogOverlay`, `DialogHeader`) live in the same file as the parent and are exported together

**App components:**
- Route-specific components go in `app/[route]/_components/` — not in `src/components/`
- App-shared components (used by multiple routes) go in `src/components/`
- Hooks used by multiple components go in `src/hooks/`

**What NOT to co-locate:**
- Do not put business logic, data fetching, or auth concerns in the same file as a UI component in `@open-tomato/ui` — the shared package is purely presentational

### Export Conventions

**Shared package (`@open-tomato/ui`):**

Simple components use inline function export:

```ts
// input.tsx, label.tsx, pill.tsx, confirm-dialog.tsx
export function Button({ className, ...props }) { ... }
```

Compound components use a grouped `export {}` block at the bottom, aliasing internal names to public names:

```ts
// dialog.tsx — internal: DialogRoot, public: Dialog
export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
```

**No barrel `index.ts`** exists in `packages/ui-ad-hoc/src/`. The package does not re-export everything through a single entry point. Consumers always import through the `package.json#exports` sub-paths:

```ts
// CORRECT — via declared exports sub-path
import { Button } from '@open-tomato/ui/components/button'
import { Dialog, DialogContent } from '@open-tomato/ui/components/dialog'
import { cn } from '@open-tomato/ui/lib/utils'

// WRONG — reaching into internal paths
import { Button } from '@open-tomato/ui/src/components/button'
```

**No default exports** — all component files use named exports only.

### Import Rules

**Within `packages/ui-ad-hoc`:**

```ts
// Internal path alias: @/* → ./src/*
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'

// Radix: bare radix-ui package (not @radix-ui/react-* scoped packages)
import { Dialog, Slot } from 'radix-ui'
```

**Within apps:**

```ts
// Shared UI: always via declared exports sub-paths
import { Button } from '@open-tomato/ui/components/button'
import { cn } from '@open-tomato/ui/lib/utils'

// App-local alias: @/* → ./src/*
import { cn } from '@/lib/utils'

// toolbox-ui also has named aliases:
import { useAgents } from '@hooks/use-agents'
import { AgentCard } from '@components/agent-card'
```

**Cross-package imports** — only via declared `package.json#exports` sub-paths. Never reach into another package's `src/` internals.

### Theme Context Rules

- `ThemeProvider` is in `packages/react/src/providers/ThemeProvider.tsx` — this is the canonical shared provider
- `apps/toolbox-ui/src/components/theme-provider.tsx` is an app-specific wrapper — do not copy it to other apps
- Never toggle `.dark` class on DOM nodes manually — only `setTheme()` from `useTheme()` is permitted
- `ThemeProvider` is mounted automatically by `createApp` in `@open-tomato/react` — never add it manually in an app that uses `createApp`

### Dynamic Colors (Anti-Pattern)

The dashboard app uses `style={{ background: \`${color}14\` }}` (hex alpha suffix on dynamic color values). This is an app-specific workaround — **do not copy** this pattern into shared components. Use semantic tokens.

**Correct alternative:** Use `color-mix()` when you need a CSS custom property at a specific opacity. CSS variables can't be string-concatenated with hex alpha suffixes, so use:

```css
/* 12% opacity of a token */
color-mix(in srgb, var(--accent) 12%, transparent)

/* 70% opacity for an overlay */
color-mix(in srgb, var(--bg) 70%, transparent)
```

This works in inline styles, ReactFlow props (`markerEnd.color`, `style.stroke`), and anywhere a CSS color value is accepted.
