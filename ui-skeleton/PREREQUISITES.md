# Prerequisites — ui-skeleton Phase 2

What must be true before executing [`PLAN.md`](./PLAN.md). None of these are produced by the plan itself.

## System tooling

- Bun 1.3.9 or newer installed and available on `PATH` (needed for `import.meta.dirname` and the multi-entry library build).
- Node.js 18 or newer.
- Git.
- macOS / Linux shell (zsh or bash).

## Repository state

- The monorepo at `/Users/marcos/projects/open-tomato/` is cloned locally.
- The directory [`packages/ui-skeleton/`](./) exists with the phase 1 output: 18 atoms under [`src/atoms/`](./src/atoms/), 6 particle modules under [`src/particles/`](./src/particles/), 9 skill directories under [`skills/`](./skills/), and the supporting build/test/storybook configs at the package root.
- The sibling shared-config directories remain readable via the existing `file:` links from [`packages/ui-skeleton/package.json`](./package.json):
  - `../shared/eslint-config/` (exposes `@open-tomato/eslint-config`)
  - `../shared/typescript-config/` (exposes `@open-tomato/typescript-config`)
- The [`packages/ui-skeleton/`](./) working tree is clean (no uncommitted changes) before starting.

## Phase 1 baseline must be green

From [`packages/ui-skeleton/`](./), all of the following exit 0:

- `bun install`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `bun run build-storybook`

The currently-known `bun run lint` failure is acceptable: it must be limited to pre-existing [`README.md`](./README.md) heading-level violations (tracked in [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #7). Failures in any atom code mean the baseline is broken and phase 2 should not start.

## Workspace status (intentional non-prerequisite)

- [`packages/ui-skeleton/`](./) is NOT registered in the root `packages/package.json` workspaces array, and will not be in phase 2. Tracked in [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #6 and explicitly deferred. The plan's package.json edits keep using `file:../shared/<name>` links rather than `workspace:^`.

## Network access

- Outbound HTTPS to the public npm/bun registry to install the 10 new dependencies the plan adds: `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-popover`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `input-otp`.
- Outbound HTTPS to `ui.shadcn.com` for optional `bunx shadcn@latest` schema validation.

## Credentials / secrets

- None. The package is internal, builds locally, and does not publish in this phase. The exports-map work (NEXT-ITERATIONS #5) lands the subpath exports but does not change the publish state.

## shadcn MCP

- The shadcn MCP server is enabled at the monorepo packages root ([`packages/.claude/settings.local.json`](../.claude/settings.local.json)). Confirm `bunx shadcn@latest --version` returns ≥ 3.4 for `--dry-run` support. The plan uses the CLI opportunistically for registry schema sanity, not as a hard requirement.

## Out of scope for prerequisites

- Sibling [`design-system/colors_and_type.css`](../../design-system/colors_and_type.css) integration is deferred ([`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #9). [`src/styles/globals.css`](./src/styles/globals.css) stays as-is in phase 2; if a molecule needs a token that does not exist there yet, add it minimally rather than redesigning the integration.
- The Storybook 8.6 vs Vite 8 peer-dep warning ([`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #3) persists and is acceptable; Storybook still builds end-to-end.
- The Vite library chunk-hashing behavior ([`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #4) is acceptable; do not chase it as part of this phase.
