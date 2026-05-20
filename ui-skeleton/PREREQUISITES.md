# Prerequisites — ui-skeleton Iteration 1

The following must be in place before executing `PLAN.md`. None of these are produced by the plan itself.

## System tooling

- Bun 1.3.9 or newer installed and available on `PATH`
- Node.js 18 or newer
- Git
- macOS / Linux shell (zsh or bash)

## Repository state

- The monorepo at `/Users/marcos/projects/open-tomato/` is cloned locally
- The directory `/Users/marcos/projects/open-tomato/packages/ui-skeleton/` exists with:
  - `package.json`
  - `tsconfig.json`
  - `eslint.config.mjs`
  - `README.md`
  - `pre-prompt.md`
- The sibling directories exist and are readable via relative path from `ui-skeleton/`:
  - `../shared/eslint-config/` (exposes `@open-tomato/eslint-config`)
  - `../shared/typescript-config/` (exposes `@open-tomato/typescript-config`)
- The `packages/ui-skeleton/` git working tree is clean (no uncommitted changes) before starting

## Workspace status (intentional non-prerequisite)

- `packages/ui-skeleton/` is NOT registered in the root `packages/package.json` workspaces array, and will not be in this iteration. The plan's first stage rewrites `workspace:^` references in `packages/ui-skeleton/package.json` to `file:` links so install works without workspace registration.

## Network access

- Outbound HTTPS to the public npm/bun registry to install dependencies
- Outbound HTTPS to `ui.shadcn.com` for `bunx shadcn@latest init` schema validation

## Credentials / secrets

- None. This package is internal, builds locally, and does not publish.

## Out of scope for prerequisites

- The sibling `design-system/colors_and_type.css` is referenced manually but not imported in this iteration; no setup required there.
- The shadcn registry is committed but never published, so no registry credentials are needed.
