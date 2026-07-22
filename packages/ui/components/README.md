# @open-tomato/ui-components

Open Tomato's component library — variant-first React components (CVA +
Tailwind 4 + Radix primitives) translated 1:1 from the Claude Design bundle.

Published to the pre-release registry (`npm.heimdall.bifemecanico.com`, LAN)
while under development; public npm comes later. The `@open-tomato` scope is
routed by `.npmrc` — publishing targets the pre-release stage unless explicitly
specified otherwise.

## Install

```bash
bun add @open-tomato/ui-components   # scope routes to the pre-release registry
```

Peer deps: `react` / `react-dom` ^19.

## Setup (Tailwind 4 consumers)

The package ships **no prebuilt utility CSS** — your Tailwind build generates
exactly the classes the components use. In your Tailwind CSS entry:

```css
@import "tailwindcss";
@import "@open-tomato/ui-components/styles.css";
```

That single import brings in, layer by layer:

| Layer                  | File                                                     | Role                                                                                                 |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| fonts                  | `fonts.css`                                              | type faces (Google Fonts today; swappable source)                                                    |
| **theme definition**   | `theme.css` (exported as `theme.css`, from `tokens.css`) | the DEFAULT theme — semantic variables (`--bg`, `--fg1`, `--primary`, …) for light + dark            |
| **component contract** | internal `@theme` mapping                                | maps semantic variables onto Tailwind utilities (`bg-primary`, `text-fg1`, …) — stable across themes |
| source scan            | `@source`                                                | points your Tailwind build at the package's JS so the components' classes are generated              |

```tsx
import { Button, Touchable } from '@open-tomato/ui-components';

<Button variant="accent" size="lg">Run agent</Button>
```

Dark mode: set `data-theme="dark"` on the document element (default follows
`prefers-color-scheme`).

## Theming (v1: theme definition via CSS)

Component layout is fixed; the **token variables are the theme**. Override the
semantic variables after the styles import:

```css
@import "tailwindcss";
@import "@open-tomato/ui-components/styles.css";

/* your theme definition — same contract tokens.css fulfills */
:root, [data-theme='light'] {
  --primary: #7a1fa2;
  --accent: #1d4ed8;
}
[data-theme='dark'] {
  --primary: #c084fc;
}
```

A future `@open-tomato` theming package (and eventually a ThemeProvider
component) will formalize this contract; the variable names above are that
contract's v1. The variable→utility mapping itself is part of the components —
don't override it.

## Development

This repo is also the design-translation workbench (design bundle under
`demo/`, authoring skill under `skills/`). See [CLAUDE.md](CLAUDE.md) and the
[migration roadmap](docs/superpowers/plans/2026-07-15-component-migration-roadmap.md).

```bash
bun run storybook          # component workbench
bun run test               # smoke layer (one test per story)
bun run test:visual        # screenshot regression vs this machine's baselines
bun run check:stories      # every story renders error-free
bun run build              # library build (dist/ — JS, d.ts, styles/)
```
