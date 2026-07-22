Refer to @AGENTS.md for the overall context of agents in this repo.

# Skills available

- [Component from design](skills/component-from-design/SKILL.md) — use for any component implementation traced back to a design source (the Claude Design bundle in `demo/design-bundle/`, or the raw design system in `demo/raw-design-system/` for the auth screens). Defines the read-design → CVA → stories → compare-fidelity loop, the file layout, and tracks which chapters/screens are done.
- [React Hooks: Avoiding Derived State and Reset-on-Open](skills/react-hooks/SKILL.md) — patterns for avoiding common bugs with `useState` and `useEffect` when state needs to reset on open or be derived from other state.

## Design sources of truth

There are **two** design sources; every component traces back to one of them. Read AGENTS.md first, then the relevant source, before touching `src/`.

1. **Design bundle** — [demo/design-bundle/](demo/design-bundle/), a Claude Design handoff. Most of the kit (atoms → templates → the app pages) traces to a chapter in `demo/design-bundle/project/src/*.jsx`; [Component-Breakdown.html](demo/design-bundle/project/Component-Breakdown.html) is its canonical visual reference.
2. **Raw design system** — [demo/raw-design-system/](demo/raw-design-system/), a separate, inline-styled prototype. The **auth screens** trace here: `demo/raw-design-system/auth.html` (+ `dashboard/Auth.jsx`, `Shared.jsx`, `Primitives.jsx`, `Profile.jsx`). The auth work lives under [src/pages/auth/](src/pages/auth/) + [src/templates/AuthShell/](src/templates/AuthShell/) as a **future authentication-package boundary** — extraction is a folder move.

### CSS cascade gotcha (bit us during the auth screens)

`src/styles/tokens.css` is a verbatim copy of the bundle's `colors_and_type.css` and defines **unlayered** element rules for `h1`–`h6`, `a`, and `p`. Unlayered author CSS beats Tailwind's `@layer utilities`, so a bare `text-[26px]` / `no-underline` / `m-0` on a **raw `<h2>` or `<a>` in page markup** silently loses to the element rule. Win with the `!` important modifier (`!text-[26px] !no-underline`) — see `AuthShell/AuthHeading.tsx`, `BrandLockup.tsx`, `SignupDonePage.tsx`, `TwoFactorPage.tsx`. Components rendered through library atoms (Button, Field, …) are unaffected; the trap is only raw `<h*>`/`<a>` you write yourself. Systemic fix (deferred): wrap those element rules in `@layer base`.

## Tooling

- **CVA + clsx + tailwind-merge** for variant-driven styling. The `cn` helper lives in `src/lib`.
- **Tailwind 4** — tokens are mapped from `src/styles/tokens.css` (verbatim copy of the bundle's `colors_and_type.css`) into `@theme` in `src/styles/global.css`.
- **Radix** primitives only when behavior needs it (Slot, Dialog, DropdownMenu, etc.) — add the package per-component, not the whole umbrella.
- **Storybook 10 + addon-vitest + Playwright** — `bun run storybook`, `bun run test`, `bun run build:storybook`. One smoke test is auto-generated per story (docs/render layer). **No DOM snapshots, and story files never import from `vitest`** (it crashes the preview). **Visual regression is a separate native suite** (`bun run test:visual`): `@storybook/test-runner` screenshots every story in light + dark and diffs against **untracked per-environment baselines** in `visual/__image_snapshots__/` (update with `bun run test:visual:update`; CI keeps its own set). Design↔component fidelity is checked with `node scripts/compare-design.mjs <story-id> <SpecName>` (bundle source, default); auth screens use `node scripts/compare-design.mjs <story-id> "<Artboard title>" --source auth`, which captures the raw `auth.html` artboards full-size in light + dark. Preview health with `bun run check:stories`. See [docs/superpowers/specs/2026-05-30-visual-testing-split-design.md](docs/superpowers/specs/2026-05-30-visual-testing-split-design.md).
