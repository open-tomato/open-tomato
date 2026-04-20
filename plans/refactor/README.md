# Legacy Monorepo Split — Refactor Plans

Index and execution guide for splitting `./legacy-monorepo/` into separate repo-scoped folders:
`open-tomato/` (monorepo of services + app), `tomato-cli/`, `template-service-express/`, `template-service-mcp/`, and `packages/` (shared workspace packages).

## Guiding Principles

- **No new features.** This refactor is purely structural. Existing libraries, runtimes, and behaviors stay identical.
- **Bun + Turborepo everywhere.** Every multi-package folder keeps `bun` as package manager/runtime, `turbo` as task runner, and shared `@open-tomato/eslint-config` + `@open-tomato/typescript-config`.
- **Small commits, frequent verification.** Each step ends with `bun lint && bun run test && bun run build` (or subset where build is `noEmit`) and a `<type>: <desc>` commit without AI attribution.
- **Cross-repo package linking order:** while everything still lives in this umbrella directory, packages are referenced via `workspace:*` inside the same root workspace; when a project is extracted to a standalone repo and that breaks workspace linking, fall back to directory paths (`"@open-tomato/logger": "file:../../packages/shared/logger"`) and finally to GitHub refs (`"user/repo#semver:^1.2.0"`) until published to the npm org registry.
- **Documentation moves with the code.** Every relocated project updates its own `README.md`, `AGENTS.md`, and any relative links before the commit.
- **Commits without Claude attribution** (already enforced globally — do not pass `--no-verify` or override).

## Execution Order

Plans are numbered in the required execution order. Each plan lists its prerequisites explicitly; do not skip ahead unless the plan says it is parallelizable.

| # | File | Scope | Parallelizable with |
|---|------|-------|---------------------|
| 00 | [00-foundation.md](./00-foundation.md) | Root umbrella tooling + baseline verification | — |
| 01 | [01-packages.md](./01-packages.md) | Migrate `legacy-monorepo/packages/*` → `./packages/{shared,service,notifications}/*` | — |
| 02 | [02-open-tomato-monorepo.md](./02-open-tomato-monorepo.md) | Scaffold `./open-tomato/` (turbo root, app stub, compose file) | 06 (cli) after 01 |
| 03 | [03-services-migration.md](./03-services-migration.md) | Move 4 services with renames + wire to relocated packages | — |
| 04 | [04-template-service-express.md](./04-template-service-express.md) | Extract `notifications` → `template-service-express/` | 05 |
| 05 | [05-template-service-mcp.md](./05-template-service-mcp.md) | Extract `context-generator` → `template-service-mcp/` | 04 |
| 06 | [06-tomato-cli.md](./06-tomato-cli.md) | Move `scripts/*` → `tomato-cli/` as standalone CLI | 02 (after 01) |
| 07 | [07-skills-and-docs.md](./07-skills-and-docs.md) | Relocate `skills/*`, scope/repoint docs | — |
| 08 | [08-additional-services.md](./08-additional-services.md) | Migrate `auth`, `knowledge-base`, `token-monitor` **using** the express template | **Requires 04** |
| 09 | [09-legacy-cleanup.md](./09-legacy-cleanup.md) | Remove `legacy-monorepo/`, finalize top-level docs | Last |

## Test Gate Between Stages

Before moving to the next plan, all of these must succeed in every relocated project:

```
bun install
bun lint
bun run test
bun run build        # or check-types if build is tsc --noEmit
```

If any gate fails, do not start the next plan — fix in place and commit the fix with `fix: <scope> <description>`.

## Package Dependency Map (discovered 2026-04-20)

Minimum packages needed for Plan 03 (4 services) + MCP template:

**Shared (framework-agnostic):**
- `eslint-config`, `typescript-config`, `logger`, `errors`, `linear` (used by scheduler)

**Service-tier:**
- `service-core`, `express`, `mcp`, `worker-protocol`

**Notifications integration:**
- `notifications-plugin-anthropic` (+ siblings `-executor`, `-tech-tree` for parity)

**Optional / used by additional services** (migrate in Plan 08 on-demand):
- `cache`, `config`, `diagnostics`, `types`, `event-bus`, `task-store`, `agent-memory`, `loop-safety`, `prompt-builder`, `orchestration`

**Not migrated** (frontend-only, dropped with apps):
- `react`, `events-ui-agents`, `ui-ad-hoc`, `hat-system` — stay buried in `legacy-monorepo/` until deleted in Plan 09

## Conventions

### Commit message format
```
<type>: <scope> <description>

<optional body>
```
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
For this refactor most commits will be `refactor:` or `chore:` plus an optional `docs:` follow-up per step.

### Verifying a move
After moving any project:
1. `cd <new-location> && bun install` (should succeed with no errors)
2. `bun lint` (fix before commit)
3. `bun run test` (must be green)
4. `bun run build` or `bun run check-types` (must be green)
5. Docs pass: README points to correct relative/absolute paths

### Rollback
Every plan is a sequence of small commits — to roll back a stage, `git revert` the offending commit range. Do not `git reset --hard` shared history.
