# Plan: UI Skeleton Package — Iteration 1 (Particles + Atoms)

> Prerequisites for executing this plan live in `PREREQUISITES.md`.

## Context

The `packages/ui-skeleton/` directory holds a `README.md` and `pre-prompt.md` describing an atomic-design wrapper library over shadcn/ui, plus a minimal `package.json`, `tsconfig.json`, and `eslint.config.mjs`. There is no `src/` yet, no Tailwind config, no Storybook, no test runner, no shadcn `components.json`. The package is intended as a blueprint that AI agents and downstream apps consume: each shadcn primitive (which can expose 10+ sub-components) is wrapped into one encapsulated component with constrained variants, so the agent's context surface stays small and styling stays consistent with a design system.

Iteration 1 scope: scaffold the package infrastructure (Tailwind v4, Vite library mode, Storybook 8, Vitest, shadcn CLI compatibility, internal shadcn registry manifest), implement the particles layer (utilities, CVA helpers, tokens, mixins), and create all 18 atoms as single-entry wrapper components with co-located variants, tests, stories, and per-component READMEs. Molecules / organisms / providers / templates / pages get placeholder barrel files only.

The package stays outside the root `packages/package.json` workspaces this iteration. Existing `workspace:^` references in `package.json` must be rewritten as `file:` links to sibling shared packages, otherwise install fails. Tokens are mirrored locally in `src/styles/globals.css`; the sibling `design-system/colors_and_type.css` is referenced manually but not imported (workspace integration deferred). The shadcn registry manifest is committed but never published — internal-only.

### Critical files to create

- `packages/ui-skeleton/src/index.ts` — top-level barrel
- `packages/ui-skeleton/src/styles/globals.css` — Tailwind v4 entry + `@theme` tokens
- `packages/ui-skeleton/src/particles/{cn,variants,tokens,animations,shadows,mixins,index}.ts`
- `packages/ui-skeleton/src/atoms/<Component>/{<Component>.tsx,<component>.variants.ts,<Component>.test.tsx,<Component>.stories.tsx,README.md,index.ts}` × 18
- `packages/ui-skeleton/src/{molecules,organisms,providers,templates,pages}/index.ts` — placeholder barrels
- `packages/ui-skeleton/.storybook/{main,preview}.ts`
- `packages/ui-skeleton/{vite.config.ts,vitest.config.ts,vitest.setup.ts,postcss.config.mjs,components.json,registry.json,tsconfig.build.json}`

### Critical files to modify

- `packages/ui-skeleton/package.json` — add deps, scripts; convert `workspace:^` to `file:` links
- `packages/ui-skeleton/tsconfig.json` — add `paths` for `@/*` alias, `jsx: "react-jsx"`, `lib: ["DOM","ES2022"]`

### Atom inventory (18)

AspectRatio, Avatar, Badge, Button, Card, Checkbox, Input, Kbd, Label, Progress, ScrollArea, Separator, Skeleton, Slider, Spinner, Textarea, Toggle, Typography.

Card uses slot-based props (`header`, `title`, `description`, `footer`, `children`) to fold shadcn's six sub-components into one wrapper. Typography, Spinner, and Kbd have no shadcn equivalent — author from scratch using only `cn` + variants. The remaining 15 wrap shadcn primitives 1:1.

### Conventions established this iteration

- **Component file naming**: PascalCase TSX file; lowercase variants file (`button.variants.ts`).
- **Types colocated** in the `.tsx` file for atoms (props interfaces are tightly bound). Separate `.types.ts` only when shared discriminated unions appear at molecule/organism level.
- **Variants colocated** with their owning component; particles only contain *shared* helpers.
- **Path alias** `@/*` → `src/*` (configured in `tsconfig.json` and Vite).
- **Imports** use the alias; barrels re-export from each layer up to `src/index.ts`.
- **Variant API is the only styling surface for consumers**; `className` exists for escape hatches only and is documented as discouraged in each component README.
- **`asChild` Slot pattern** (Radix) is the polymorphism mechanism for atoms that need to render as another element.
- **Test minimum per atom**: renders, applies variant class, accessibility check via `jest-axe`. Coverage threshold 80%/80%/75%/80%.
- **Story minimum per atom**: `Default` story + `AllVariants` matrix story; `tags: ["autodocs"]` enabled.
- **README minimum per atom**: import line, props table, variants table, accessibility notes, Do/Don't.

## Reference code patterns

### `src/particles/cn.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### `src/particles/index.ts`

```ts
export { cn } from "./cn";
export * from "./variants";
export * from "./tokens";
export * from "./animations";
export * from "./shadows";
export * from "./mixins";
```

### `src/styles/globals.css`

```css
@import "tailwindcss";

@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch(0.55 0.18 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.92 0 0);
  --color-secondary-foreground: oklch(0.2 0 0);
  --color-destructive: oklch(0.6 0.22 25);
  --color-destructive-foreground: oklch(0.98 0 0);
  --color-accent: oklch(0.92 0 0);
  --color-accent-foreground: oklch(0.2 0 0);
  --color-muted: oklch(0.96 0 0);
  --color-muted-foreground: oklch(0.4 0 0);
  --color-border: oklch(0.9 0 0);
  --color-input: oklch(0.9 0 0);
  --color-ring: oklch(0.55 0.18 250);
  --radius: 0.5rem;
  --animate-spin: spin 1s linear infinite;
  --shadow-elev-1: 0 1px 2px oklch(0 0 0 / 0.08);
  --shadow-elev-2: 0 4px 8px oklch(0 0 0 / 0.10);
}

@layer base {
  *,
  ::before,
  ::after {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

### CVA variants pattern — `src/atoms/Button/button.variants.ts`

```ts
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-10 px-6", icon: "size-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

### Wrapper component — `src/atoms/Button/Button.tsx`

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/particles/cn";
import { buttonVariants, type ButtonVariants } from "./button.variants";

/**
 * Button — single encapsulated wrapper over shadcn primitives.
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Save</Button>
 * <Button asChild><Link href="/">Home</Link></Button>
 * ```
 */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    ButtonVariants {
  /** Render as child element (Radix Slot) for composition with `<a>`, Next `<Link>`, etc. Requires a single child. */
  asChild?: boolean;
  /** Optional leading icon node. */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon node. */
  trailingIcon?: React.ReactNode;
  /** Shows loading state and disables interaction. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild, leadingIcon, trailingIcon, loading, disabled, children, ...rest },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-loading={loading || undefined}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </Comp>
    );
  },
);
Button.displayName = "Button";
```

### Per-component `index.ts`

```ts
export * from "./Button";
export * from "./button.variants";
```

### Storybook stories template — `src/atoms/Button/Button.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "outline", "ghost", "destructive"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { children: "Button" },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex gap-2">
      {(["primary", "secondary", "outline", "ghost", "destructive"] as const).map((v) => (
        <Button key={v} {...args} variant={v}>
          {v}
        </Button>
      ))}
    </div>
  ),
};
```

### Vitest smoke test template — `src/atoms/Button/Button.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });

  it("is disabled when loading", () => {
    render(<Button loading>x</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<Button>ok</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### Per-component `README.md` template

```markdown
# Button

Single-entry wrapper over shadcn Button. All styling driven by `variant` + `size`.

## Import

`import { Button } from "@open-tomato/ui-skeleton";`

## Props

| Prop          | Type                                                              | Default   |
|---------------|-------------------------------------------------------------------|-----------|
| variant       | "primary" \| "secondary" \| "outline" \| "ghost" \| "destructive" | "primary" |
| size          | "sm" \| "md" \| "lg" \| "icon"                                    | "md"      |
| asChild       | boolean                                                           | false     |
| loading       | boolean                                                           | false     |
| leadingIcon   | ReactNode                                                         | —         |
| trailingIcon  | ReactNode                                                         | —         |

## Variants

(matrix of visual examples)

## Accessibility

- Native `<button>` semantics; supports `aria-*` passthrough.
- `loading` sets `data-loading` and disables interaction.

## Do / Don't

- DO use `variant` and `size`. DON'T pass arbitrary `className`.
- DO use `asChild` for polymorphism. DON'T pass multiple children when `asChild` is true.
```

### Vite library mode — `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

const atoms = [
  "AspectRatio","Avatar","Badge","Button","Card","Checkbox","Input","Kbd","Label",
  "Progress","ScrollArea","Separator","Skeleton","Slider","Spinner","Textarea","Toggle","Typography",
];

export default defineConfig({
  plugins: [react(), dts({ include: ["src"], tsconfigPath: "./tsconfig.build.json" })],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        particles: resolve(__dirname, "src/particles/index.ts"),
        ...Object.fromEntries(
          atoms.map((a) => [`atoms/${a}`, resolve(__dirname, `src/atoms/${a}/index.ts`)]),
        ),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
      output: { preserveModules: false, entryFileNames: "[name].js" },
    },
    sourcemap: true,
    target: "es2022",
  },
});
```

### Storybook config — `.storybook/main.ts` and `.storybook/preview.ts`

```ts
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y", "@storybook/addon-interactions"],
  framework: { name: "@storybook/react-vite", options: {} },
  docs: { autodocs: "tag" },
  typescript: { reactDocgen: "react-docgen-typescript" },
};
export default config;
```

```ts
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    a11y: { disable: false },
  },
};
export default preview;
```

### Vitest config — `vitest.config.ts` and `vitest.setup.ts`

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        thresholds: { lines: 80, statements: 80, branches: 75, functions: 80 },
      },
    },
  }),
);
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);
```

### shadcn integration — `components.json` and `registry.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/atoms",
    "utils": "@/particles/cn",
    "ui": "@/atoms",
    "lib": "@/particles",
    "hooks": "@/particles"
  },
  "iconLibrary": "lucide"
}
```

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "open-tomato-skeleton",
  "homepage": "internal",
  "items": [
    {
      "name": "button",
      "type": "registry:ui",
      "files": [
        { "path": "src/atoms/Button/Button.tsx", "type": "registry:ui" },
        { "path": "src/atoms/Button/button.variants.ts", "type": "registry:ui" }
      ],
      "registryDependencies": ["@radix-ui/react-slot"]
    }
  ]
}
```

### `postcss.config.mjs`

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

### `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "emitDeclarationOnly": true,
    "declaration": true,
    "outDir": "dist",
    "noEmit": false
  },
  "include": ["src"],
  "exclude": ["**/*.test.*", "**/*.stories.*", ".storybook"]
}
```

### `package.json` script additions (illustrative)

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "check-types": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "shadcn:add": "bunx shadcn@latest add"
  }
}
```

## Tasks

```markdown
# Stage: Pre-flight

- [x] Confirm sibling dirs exist: `packages/shared/eslint-config/`, `packages/shared/typescript-config/`
- [x] Confirm `packages/ui-skeleton/` git tree is clean
- [x] Rewrite `workspace:^` references in `packages/ui-skeleton/package.json` to `file:../shared/eslint-config` and `file:../shared/typescript-config`
- [x] Verify `bun install` succeeds inside `packages/ui-skeleton/` after the rewrite

# Stage: Dependencies

- [x] Add runtime deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `lucide-react`
- [x] Add Radix primitives for atoms that wrap them: `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-label`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-toggle`
- [x] Add dev deps for Tailwind v4: `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `@tailwindcss/vite@^4`, `postcss`
- [x] Add dev deps for build: `vite`, `@vitejs/plugin-react`, `vite-plugin-dts`
- [x] Add dev deps for test: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-axe`, `@types/jest-axe`
- [x] Add dev deps for Storybook 8: `storybook`, `@storybook/react-vite`, `@storybook/addon-essentials`, `@storybook/addon-a11y`, `@storybook/addon-interactions`, `@storybook/test`
- [x] Move `react` and `react-dom` to `peerDependencies` while keeping a dev mirror

# Stage: Tooling config

- [x] Create `src/styles/globals.css` with `@import "tailwindcss"`, `@theme` token block, and base layer
- [x] Create `postcss.config.mjs`
- [x] Create `components.json` at package root pointed at `src/styles/globals.css` and `@/atoms` alias
- [x] Create `registry.json` at package root with a stub `button` item; do NOT publish
- [x] Update `tsconfig.json` to include `paths: { "@/*": ["src/*"] }`, `jsx: "react-jsx"`, `lib: ["DOM","DOM.Iterable","ES2022"]`, `moduleResolution: "bundler"`
- [x] Create `tsconfig.build.json` with `emitDeclarationOnly`
- [x] Create `vite.config.ts` with library multi-entry and `@` alias, `vite-plugin-dts`, externalized peers
- [x] Create `vitest.config.ts` merging `vite.config.ts` with jsdom + coverage thresholds
- [x] Create `vitest.setup.ts` registering jest-dom and jest-axe matchers
- [x] Create `.storybook/main.ts` with react-vite framework and autodocs
- [x] Create `.storybook/preview.ts` importing `src/styles/globals.css`
- [x] Update `package.json` scripts: build (vite build), dev (vite), test, test:watch, test:coverage, storybook, build-storybook, shadcn:add
- [x] Run `bunx shadcn@latest init --yes` to validate CLI parses `components.json`

# Stage: Particles

- [x] Create `src/particles/cn.ts` (clsx + tailwind-merge wrapper)
- [x] Create `src/particles/variants.ts` re-exporting `cva` and `VariantProps` plus shared variant helpers
- [x] Create `src/particles/tokens.ts` exporting TS-typed mirror of `@theme` token names (radius, animate, shadow)
- [x] Create `src/particles/animations.ts` exporting animation class constants (spin, pulse, fade)
- [x] Create `src/particles/shadows.ts` exporting elevation class constants (`shadow-elev-1`, `shadow-elev-2`)
- [x] Create `src/particles/mixins.ts` exporting composable className mixins (focus ring, disabled state)
- [x] Create `src/particles/index.ts` barrel
- [x] Add `src/particles/__tests__/cn.test.ts` verifying tailwind-merge conflict resolution

# Stage: Atom scaffolding generator (one-time)

- [x] Document the per-atom file set in `pre-prompt.md` so future agents know the convention
- [x] Choose generation approach: hand-write Button as canonical reference, then copy-shape for the rest

# Stage: Atoms — shadcn-wrapping (15)

- [x] AspectRatio: wraps `@radix-ui/react-aspect-ratio`; variants `{ ratio: "square"|"video"|"portrait" }`
- [ ] Avatar: wraps `@radix-ui/react-avatar`; variants `{ size, shape }`; image+fallback slot props
- [ ] Badge: pure CVA over `<span>`; variants `{ variant: primary|secondary|outline|destructive, size }`
- [ ] Button: wraps with `Slot` for `asChild`; variants `{ variant, size }`; props `loading`, `leadingIcon`, `trailingIcon`
- [ ] Card: slot-based wrapper (props `header`, `title`, `description`, `footer`, `children`); variants `{ variant: default|elevated|outlined, padding }`
- [ ] Checkbox: wraps `@radix-ui/react-checkbox`; variants `{ size }`; supports `label` prop
- [ ] Input: wraps `<input>`; variants `{ size, variant: default|error|success }`; props `leadingIcon`, `trailingIcon`
- [ ] Label: wraps `@radix-ui/react-label`; variants `{ size, required: boolean }`
- [ ] Progress: wraps `@radix-ui/react-progress`; variants `{ size, variant }`
- [ ] ScrollArea: wraps `@radix-ui/react-scroll-area`; variants `{ orientation: vertical|horizontal|both }`
- [ ] Separator: wraps `@radix-ui/react-separator`; variants `{ orientation, variant }`
- [ ] Skeleton: pure CVA over `<div>`; variants `{ variant: rect|circle|text, animate: pulse|wave|none }`
- [ ] Slider: wraps `@radix-ui/react-slider`; variants `{ size }`
- [ ] Textarea: wraps `<textarea>`; variants `{ size, variant }`; props `autoResize`
- [ ] Toggle: wraps `@radix-ui/react-toggle`; variants `{ variant, size }`

# Stage: Atoms — author from scratch (3)

- [ ] Kbd: pure CVA over `<kbd>`; variants `{ size, variant }`; renders keyboard shortcuts
- [ ] Spinner: pure CVA over `<div>` with `animate-spin`; variants `{ size, variant }`
- [ ] Typography: polymorphic `as` prop (h1-h6, p, span, code); variants `{ variant: display|h1|h2|h3|h4|body|caption|code|kbd, weight, align }`

# Stage: Per-atom artifacts (apply to every atom above)

- [ ] Create `<Component>.tsx` with TSDoc, `forwardRef`, props interface
- [ ] Create `<component>.variants.ts` with `cva()` + `VariantProps` export
- [ ] Create `<Component>.test.tsx` with at least: renders children, applies variant class, jest-axe a11y assertion
- [ ] Create `<Component>.stories.tsx` with `Default` and `AllVariants` stories, autodocs tag
- [ ] Create `README.md` per the template (import, props table, variants table, a11y notes, Do/Don't)
- [ ] Create `index.ts` barrel: `export * from "./<Component>"; export * from "./<component>.variants";`

# Stage: Higher-layer placeholders

- [ ] Create `src/molecules/index.ts` (empty `export {};`)
- [ ] Create `src/organisms/index.ts`
- [ ] Create `src/providers/index.ts`
- [ ] Create `src/templates/index.ts`
- [ ] Create `src/pages/index.ts`

# Stage: Top-level wiring

- [ ] Create `src/atoms/index.ts` re-exporting every atom barrel
- [ ] Create `src/index.ts` re-exporting `./particles`, `./atoms`, `./molecules`, `./organisms`, `./providers`, `./templates`, `./pages`

# Stage: Registry entries

- [ ] Append each atom to `registry.json` `items[]` with `path`, `type`, and any `registryDependencies`
- [ ] Document in `README.md` (top-level) that the registry is internal and not published

# Stage: Verification

- [ ] Run `bun install` — must complete without resolution errors
- [ ] Run `bun run check-types` — passes with zero errors
- [ ] Run `bun run lint` — passes
- [ ] Run `bun run test` — every atom's smoke tests pass; coverage thresholds met
- [ ] Run `bun run build` — `dist/` contains `index.js`, `particles.js`, and per-atom `atoms/<Name>.js` plus matching `.d.ts`
- [ ] Run `bun run storybook` — Storybook starts on 6006; every atom renders its `Default` and `AllVariants` stories; autodocs page generated
- [ ] Run `bun run build-storybook` — static Storybook build succeeds
- [ ] Run `bunx shadcn@latest init --yes` — CLI accepts `components.json`
- [ ] Spot-check `bunx shadcn@latest add button` would map into `src/atoms/Button/` (dry-run, do not overwrite)
- [ ] Manually open Storybook for Button, Input, Card, Typography to confirm tokens resolve (background/foreground/primary/destructive render as expected)
```

## Open follow-ups (not in this iteration)

- Register `ui-skeleton` in the root `packages/package.json` workspaces and flip `file:` deps back to `workspace:^`.
- Import `design-system/colors_and_type.css` once the workspace registration lands; remove the local token snapshot in `globals.css`.
- Storybook + Vite library mode share `vite.config.ts`; if Storybook conflicts with `build.lib`, split into `vite.lib.config.ts` consumed only by `bun run build`.
- Build out molecules, organisms, providers, templates, pages.
- Decide on final polymorphism API for Card (slot props vs. composition).
- Add `peerDependenciesMeta` for optional Radix peers.
- Publish the internal registry to a private location if/when external consumption is desired.
