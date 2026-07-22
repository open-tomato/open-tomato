# @open-tomato/ui-components

Open Tomato's component library — variant-first React components (CVA +
Tailwind 4 + Radix primitives).

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
| **theme definition**   | `tokens.css` (exported as `theme.css`)                   | the DEFAULT theme — semantic variables (`--bg`, `--fg1`, `--primary`, …) for light + dark            |
| **component contract** | internal `@theme` mapping                                | maps semantic variables onto Tailwind utilities (`bg-primary`, `text-fg1`, …) — stable across themes |
| source scan            | `@source`                                                | points your Tailwind build at the package's JS so the components' classes are generated              |

The fonts and tokens layers are owned by
[`@open-tomato/theme-default`](../../shared/theme-default) and copied into
`dist/styles` at build time.

```tsx
import { Button, Touchable } from '@open-tomato/ui-components';

<Button variant="accent" size="lg">Run agent</Button>
```

Dark mode: set `data-theme="dark"` on the document element (default follows
`prefers-color-scheme`).

## Theming (v1: theme definition via CSS)

Component layout is fixed; the **token variables are the theme**. The default
theme definition lives in `@open-tomato/theme-default`. Override the semantic
variables after the styles import:

```css
@import "tailwindcss";
@import "@open-tomato/ui-components/styles.css";

/* your theme definition — same contract theme-default's tokens.css fulfills */
:root, [data-theme='light'] {
  --primary: #7a1fa2;
  --accent: #1d4ed8;
}
[data-theme='dark'] {
  --primary: #c084fc;
}
```

`@open-tomato/theme-default` (and eventually a ThemeProvider component)
formalizes this contract. The variable→utility mapping itself is part of the
components — don't override it.

## Development

This package is also the component workbench (Storybook + smoke/visual test
suites). See [CLAUDE.md](CLAUDE.md) and the PoC release plan under
`docs/plans/poc-release/` (repo root), workstream 05.

```bash
bun run storybook          # component workbench
bun run test               # smoke layer (one test per story)
bun run test:visual        # screenshot regression vs this machine's baselines
bun run check:stories      # every story renders error-free
bun run build              # library build (dist/ — JS, d.ts, styles/)
```
