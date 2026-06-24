# AGENTS — packages/

This directory hosts the `@open-tomato/*` shared package ecosystem. All sub-packages are workspace members of the root `open-tomato/` workspace and are published to the private registry (`npm.heimdall.bifemecanico.com`) via Changesets + the publish pipeline in `packages/scripts/`.

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow), then the specific package's own `AGENTS.md` if it has one.

## Layout

| Group | Path | Contents |
| --- | --- | --- |
| Shared | `packages/shared/*` | Framework-agnostic utilities (`logger`, `errors`, `linear`, `cache`, `config`, `types`, `task-store`, `event-bus`, `diagnostics`, `loop-safety`, `prompt-builder`, `agent-memory`, `eslint-config`, `typescript-config`) |
| Service | `packages/service/*` | Service-tier libraries (`express`, `mcp`, `service-core`, `orchestration`, `worker-protocol`) |
| Notifications | `packages/notifications/*` | Notification plugins (`plugin-anthropic`, `plugin-executor`, `plugin-tech-tree`) |
| Agents | `packages/agents/*` | Agent infrastructure (`config` — the agent configuration package, NOT the service-config which lives in `shared/config`) |
| UI | `packages/ui-skeleton` | UI component library (on-hold; resumes after visual-testing pipeline lands) |
| Scripts | `packages/scripts/` | Publish pipeline (`preflight.ts`, `prepare-publish.ts`, `publish-packages.ts`, `graduate.ts`, `registry.ts`) |

## Internal dependency policy

Every internal `@open-tomato/*` dep MUST use `workspace:^`. The publish pipeline (`prepare-publish.ts`) rewrites `workspace:^` to `^<version>` at stage time. Do **not** use `workspace:*` — the rewriter is not written for it and may ship broken tarballs. Do **not** use `file:` refs.

## Naming convention

- **Shared `@open-tomato/config`** = service-config standard (OPT-176; loader, schema, validation). Lives at `packages/shared/config`.
- **`@open-tomato/agents-config`** = agent configuration. Lives at `packages/agents/config`.

These are distinct on purpose. Past confusion between them is the original failure that triggered the structural reorg — do not conflate.

## Publish workflow

See `packages/RELEASING.md` and `packages/VERSIONING.md`. Quick path:

1. `bun run changeset:add` (or hand-author a `.changeset/*.md`)
2. `bun run preflight` — must pass
3. `bun run publish:dry` — full pipeline dry-run
4. `bun run publish:local` — actually publishes (requires registry credentials)

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../plans/INDEX.md`](../plans/INDEX.md) — initiative registry
- `RELEASING.md`, `VERSIONING.md` — publish contract
