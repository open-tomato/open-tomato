---
name: storybook
description: Use when adding or editing a *.stories.tsx file, configuring Storybook (.storybook/main.ts / preview.ts), running storybook dev or build-storybook, or doing headless verification of which stories were picked up. Covers Storybook 8.6 setup, the known warnings, the static build layout, and the index.json manifest trick.
---

# Storybook

This skill covers the Storybook side of the six-file convention. Every atom ships a `<Component>.stories.tsx` with at minimum a `Default` story and an `AllVariants` matrix; `tags: ['autodocs']` is enabled.

For the file convention and how it fits the atom layout, see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md). For CVA variant patterns referenced in the matrix stories, see [../cva-variants/SKILL.md](../cva-variants/SKILL.md).

## Stack

- **Storybook 8** — pinned to `^8` (resolves to 8.6.x).
- **`@storybook/react-vite`** — Vite-backed builder.
- **`@storybook/addon-essentials`** — controls, actions, viewport, backgrounds, etc.
- **`@storybook/addon-a11y`** — axe-powered a11y panel.
- **`@storybook/addon-interactions`** — play function recording.
- **`@storybook/test`** — `expect`, `userEvent`, `within` for play functions.

## Story file requirements

```tsx
// src/atoms/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    asChild: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'primary', size: 'md', children: 'Save' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3">
      {(['primary', 'secondary', 'destructive'] as const).map((v) =>
        (['sm', 'md', 'lg'] as const).map((s) => (
          <Button key={`${v}-${s}`} variant={v} size={s}>
            {v} / {s}
          </Button>
        )),
      )}
    </div>
  ),
};
```

### Minimum content

- `title: 'Atoms/<Component>'` — drives the sidebar grouping.
- `component: <Component>` — wires up autodocs prop extraction.
- `tags: ['autodocs']` — generates the Docs page automatically.
- `argTypes` for every variant prop — gives controls real values to choose from. Don't rely on autodocs to infer the union; explicitly list `options` for select-style controls.
- At least one `Default` story and one `AllVariants` matrix.

The `AllVariants` matrix renders every variant value side-by-side. The minimum visualization is a grid for two-axis variants (e.g. `variant × size`); for one-axis variants a single row is fine.

## `.storybook/main.ts` and `preview.ts`

`.storybook/main.ts` declares the addons and the story glob. The glob must reach `src/atoms/**/*.stories.tsx`.

`.storybook/preview.ts` imports `src/styles/globals.css` so the Tailwind v4 stylesheet (including `@theme` token declarations and generated utilities) is available in every story render. Without this import, components render without their design-system styling.

```ts
// .storybook/preview.ts
import '../src/styles/globals.css';
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
```

## Known warnings (informational, not blockers)

### Vite 8 peer-dep mismatch

`@storybook/*@8.6.x` declares a Vite peer range that does not include Vite 8. `bun add` emits `warn: incorrect peer dependency "vite@8.0.13"`. Storybook dev and build both work end-to-end. Tracked in [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md).

### Minor-version drift within `@storybook/*`

Storybook 8.6.18 emits WARN lines about minor-version drift inside the `@storybook/*` family (e.g. `addon-essentials@8.6.14` vs. core `8.6.18`) at startup. These do NOT block dev/build — Storybook starts and serves normally. Don't auto-bump the addons to chase the warnings unless something actually breaks; the warnings are informational.

### Build-time `eval` and chunk-size warnings

Storybook build at v8.6.18 + Vite 8.0.13 emits two non-fatal warnings:

1. `[EVAL] Use of direct eval function is strongly discouraged` from `node_modules/@storybook/core/dist/preview/runtime.js` (Storybook uses eval for source-sanitized code rendering in the Docs addon).
2. Chunk-size warnings for the `preview-*.js` / `components-*.js` / `axe-*.js` chunks exceeding 500 kB.

Both are upstream library behavior and don't affect runtime correctness. Ignore unless a security / perf budget specifically rules them out.

## Dev server and build outputs

### Dev server

```bash
bun run storybook
# → Storybook on http://localhost:6006
```

### Static build

```bash
bun run build-storybook
# → static site in storybook-static/
```

The `storybook-static/` directory mirrors the dev manifest shape:

- `index.html` — manager shell.
- `iframe.html` — preview shell.
- `index.json` — CSF v3 stories manifest (same content as `:6006/index.json` during dev).
- Per-title subdirs (`atoms/`, `molecules/`, ...) holding auto-generated iframe HTML for each story.
- `assets/` — hashed CSS / JS chunks.

`storybook-static/` is a build artifact and is in `.gitignore`.

### Naming collision: dist vs. storybook-static/assets

`storybook-static/assets/` contains hashed module chunks named `dist-<hash>.js` even though the library is built as `dist/<entry>.js`. These are Storybook's per-entry chunks for the discovered story files. The naming collision with the library `dist/` directory is purely cosmetic; the two never share a build root. Don't confuse them when debugging asset references.

## Headless verification — the `index.json` trick

Storybook exposes a JSON manifest of every discovered story at `http://localhost:6006/index.json` (dev) or `storybook-static/index.json` (build). This is the fastest way to verify which stories were picked up without launching a browser.

The manifest follows the CSF v3 schema:

```json
{
  "v": 5,
  "entries": {
    "atoms-button--default": {
      "id": "atoms-button--default",
      "title": "Atoms/Button",
      "name": "Default",
      "type": "story",
      ...
    },
    "atoms-button--docs": {
      "id": "atoms-button--docs",
      "title": "Atoms/Button",
      "name": "Docs",
      "type": "docs",
      ...
    }
  }
}
```

Each story is `type: 'story'`; each autodocs page is `type: 'docs'` (named `Docs`).

### Group entries by leading title segment

```bash
curl -s http://localhost:6006/index.json | jq '
  .entries
  | group_by(.title)
  | map({title: .[0].title, stories: map(.name)})
'
```

Or against the static build:

```bash
jq '.entries | group_by(.title) | map({title: .[0].title, stories: map(.name)})' storybook-static/index.json
```

Use this in CI / scripts to confirm every expected atom shipped.

### Story IDs

Story IDs are kebab-case of the title path joined with `--`:

- `Atoms/Button` → `atoms-button--default`, `atoms-button--all-variants`, `atoms-button--docs`.

Iframe story pages live at:

- `/iframe.html?viewMode=story&id=<kebab-id>` for individual stories.
- `/iframe.html?viewMode=docs&id=<kebab-id>--docs` for autodocs pages.

Both return HTTP 200 with a `<div id="storybook-root">` shell when the manifest entry exists.

## Headless verification of "tokens reach the bundle"

Combining the static build artifacts gives a complete end-to-end check that design tokens actually render — without launching a browser:

1. **`storybook-static/assets/preview-*.css`** contains the `@theme` token declarations as `--color-<name>:<hex>;--color-<name>:<lab(...)>;` pairs (Tailwind v4 ships hex fallback + `lab()` equivalent for modern browsers).

   ```bash
   grep -c '\-\-color-primary' storybook-static/assets/preview-*.css
   ```

2. **The same file** contains generated utilities for every declared token:

   ```bash
   grep '\.bg-primary' storybook-static/assets/preview-*.css
   # → .bg-primary{background-color:var(--color-primary)}
   ```

3. **Each `assets/<Atom>.stories-<hash>.js` chunk** inlines the cva-block class strings (e.g. `'bg-primary text-primary-foreground'`) as plain string literals, proving the variant table reached the bundle:

   ```bash
   grep -l 'bg-primary text-primary-foreground' storybook-static/assets/*.stories-*.js
   ```

Combining the three confirms the render path end-to-end: tokens → utilities → applied classes. Faster, more rigorous, and CI-friendly compared to eyeballing colors in a browser.

This is also how to catch the [silent-token-drop trap](../styling/SKILL.md) in CI — if `.bg-card` is missing from `preview-*.css` despite atoms referencing it, Tailwind dropped the class because `--color-card` isn't declared.
