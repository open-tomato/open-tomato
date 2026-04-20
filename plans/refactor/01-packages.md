# Plan 01 — Shared Packages Migration

## Scope
Relocate `./legacy-monorepo/packages/*` into `./packages/{shared,service,notifications}/*`, preserving `workspace:*` wiring so the migrated services in later plans pick them up cleanly. Set up `./packages/` itself as a Bun workspace with `turbo` pipelines.

## Prerequisites
- [x] Plan 00 complete (BASELINE.md exists, umbrella scaffolding clean).

## Out of Scope
- Migrating services (Plan 03) or the MCP template (Plan 05) — they consume these packages but are not touched here.
- Publishing to npm — add a **disabled** CI stub only (Step 01.6).
- Frontend-only packages (`react`, `events-ui-agents`, `ui-ad-hoc`, `hat-system`) — left in `legacy-monorepo/` and removed in Plan 09.

---

## Target Layout

```
./packages/
├── package.json                 # private root workspace: { "workspaces": ["shared/*","service/*","notifications/*"] }
├── turbo.json                   # pipelines: build / lint / test / check-types
├── tsconfig.json                # extends shared/typescript-config/base.json
├── eslint.config.ts             # extends shared/eslint-config
├── README.md
├── shared/
│   ├── eslint-config/
│   ├── typescript-config/
│   ├── logger/
│   ├── errors/
│   ├── config/
│   ├── cache/
│   ├── diagnostics/
│   ├── types/
│   ├── event-bus/
│   ├── task-store/
│   ├── agent-memory/
│   ├── loop-safety/
│   ├── prompt-builder/
│   └── linear/                  # Linear API client — general-purpose
├── service/
│   ├── service-core/
│   ├── express/
│   ├── mcp/
│   ├── worker-protocol/
│   └── orchestration/
└── notifications/
    ├── plugin-anthropic/        # renamed from notifications-plugin-anthropic
    ├── plugin-executor/
    └── plugin-tech-tree/
```

**Naming convention:** keep the npm package name identical (`@open-tomato/logger`, `@open-tomato/notifications-plugin-anthropic`). Only the on-disk folder name is normalized inside `notifications/` — drop the `notifications-` prefix because the folder already provides context.

---

## Steps

### Step 01.1 — Bootstrap `./packages/` as a Bun workspace root
**Actions:**
1. Write `./packages/package.json`:
   ```json
   {
     "name": "@open-tomato/packages-root",
     "private": true,
     "type": "module",
     "packageManager": "bun@1.3.9",
     "workspaces": ["shared/*", "service/*", "notifications/*"],
     "scripts": {
       "build": "turbo run build",
       "check-types": "turbo run check-types",
       "lint": "turbo run lint",
       "test": "turbo run test"
     },
     "devDependencies": { "turbo": "^2.5.0", "typescript": "^5.9.3" }
   }
   ```
2. Write `./packages/turbo.json` matching the legacy one (build/lint/test tasks, `^build` dependency).
3. Copy `./legacy-monorepo/tsconfig.json` content, retarget `extends` once `typescript-config` is moved (Step 01.2).

**Commit:** `chore: bootstrap packages workspace root`

---

### Step 01.2 — Move `typescript-config` and `eslint-config` first
**Why first:** every other package depends on them transitively.

**Actions:**
1. `mv legacy-monorepo/packages/typescript-config  packages/shared/typescript-config`
2. `mv legacy-monorepo/packages/eslint-config      packages/shared/eslint-config`
3. Update `./packages/tsconfig.json` to `extends: "./shared/typescript-config/base.json"`.
4. Update `./packages/eslint.config.ts` (create new) to import from `./shared/eslint-config`.
5. `cd packages && bun install` — expect workspace resolution to succeed.
6. `bun lint && bun check-types` inside `packages/shared/{eslint-config,typescript-config}`.

**Commit:** `refactor: relocate eslint-config and typescript-config to packages/shared`

**Docs:** update each moved package's `README.md` import-path examples (replace any `legacy-monorepo/packages/...` paths).

---

### Step 01.3 — Migrate shared packages (framework-agnostic)
**Order (topological, deps first):**
1. `errors`
2. `logger` (no `@open-tomato` deps)
3. `types`
4. `config`
5. `diagnostics`
6. `cache`
7. `event-bus`
8. `task-store`
9. `agent-memory`
10. `loop-safety`
11. `prompt-builder`
12. `linear`

**For each package:**
1. `mv legacy-monorepo/packages/<name> packages/shared/<name>`.
2. In the moved `package.json`, no change needed — `workspace:*` still resolves because we are in the same workspace root. The legacy root `package.json` still globs `packages/*` inside `legacy-monorepo/` only; the umbrella root isn't a workspace — the two are independent workspace roots.
3. Verify `bun install` in `./packages/` succeeds.
4. `bun run test --filter=@open-tomato/<name>` (or `cd packages/shared/<name> && bun run test`).
5. `bun lint` in the package.

**Commit cadence:** one commit per package (`refactor: relocate <name> to packages/shared`) OR one commit per batch of 3 if all are trivially no-dep. Prefer per-package for bisect safety.

**Docs:** after each move update the package's `README.md` path references and bump a small `CHANGELOG.md` note `- moved to packages/shared/<name>`.

**Test gate:** after the batch completes `bun run test` at `./packages/` root must be green.

---

### Step 01.4 — Migrate service-tier packages
**Order (deps first):**
1. `service-core` (depends on `errors`, `logger` — already migrated)
2. `express` (depends on `service-core`)
3. `mcp` (depends on `service-core`, `logger`)
4. `worker-protocol`
5. `orchestration`

**For each:** same steps as 01.3.

**Commit cadence:** one commit per package, `refactor: relocate <name> to packages/service`.

**Test gate:** `bun run test` at `./packages/` root must be green after each package.

---

### Step 01.5 — Migrate notifications plugins
**Packages:**
1. `notifications-plugin-anthropic` → `packages/notifications/plugin-anthropic`
2. `notifications-plugin-executor` → `packages/notifications/plugin-executor`
3. `notifications-plugin-tech-tree` → `packages/notifications/plugin-tech-tree`

**Important:** the npm package name stays `@open-tomato/notifications-plugin-anthropic` etc. Only the folder is shortened.

**For each:** move + test as in 01.3.

**Commit:** `refactor: relocate notification plugins to packages/notifications`

---

### Step 01.6 — Add disabled publish pipeline stub
**Goal:** Scaffold `./.github/workflows/packages-publish.yml` that runs build + dry-run publish on tag push, but with its `on:` block commented out so it cannot fire until enabled.

**Actions:**
1. Create the workflow file with a clear header comment: `# DISABLED: enable after npm org registry is configured. See plans/refactor/01-packages.md §01.6.`
2. The job itself should call `bun install && bun run build && bun publish --dry-run -w packages/shared/* -w packages/service/* -w packages/notifications/*` (all `--access public`).

**Commit:** `ci: add disabled publish workflow stub for packages`

**Verify:** `gh workflow list` shows the file but no active trigger.

---

### Step 01.7 — Update umbrella AGENTS.md and root README pointers
**Actions:**
1. Update `./AGENTS.md` (from Plan 00) — list each packages sub-group and what lives in it.
2. Update `./packages/README.md` with the layout diagram from the top of this plan.
3. Replace every `./legacy-monorepo/packages/` link discovered inside `./packages/**/README.md` with `../<relative>` or absolute (e.g., `https://github.com/<owner>/<repo>/tree/main/packages/shared/logger`) — pick whichever the repo convention uses. Default: relative paths.

**Commit:** `docs: point shared package docs to new locations`

---

## Completion Criteria
- [ ] All listed packages live under `./packages/{shared,service,notifications}/` with identical npm names.
- [ ] `cd packages && bun install && bun run build && bun run test && bun lint` all green.
- [ ] `./legacy-monorepo/packages/` contains only the frontend packages (`react`, `events-ui-agents`, `ui-ad-hoc`, `hat-system`) — everything else migrated.
- [ ] Disabled publish workflow committed.
- [ ] Root and packages READMEs updated.

## Exit
Proceed to [02-open-tomato-monorepo.md](./02-open-tomato-monorepo.md) (services) or [06-tomato-cli.md](./06-tomato-cli.md) (CLI) — these two branches are independent after this plan.
