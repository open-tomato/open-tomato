# Plan 06 — `tomato-cli/` Standalone CLI

## Scope
Move `./legacy-monorepo/scripts/*` into `./tomato-cli/` and make it runnable standalone — installable as a global (`bun install -g @open-tomato/tomato-cli`) or one-shot (`bunx @open-tomato/tomato-cli`). Add repo-root detection so commands that need workspace context (dependencies check, linear sync, ralph loop) locate the target repo via walking parent directories.

## Prerequisites
- [x] Plan 00 complete
- [x] Plan 01 complete (shared packages — CLI may depend on `@open-tomato/logger`, `@open-tomato/errors`, `@open-tomato/linear`)

## Out of Scope
- Feature work on the CLI (user has a separate planned enhancement).
- Publishing to npm — disabled CI stub only.
- Loose scripts that were worker-related (absorbed into `task-worker` in Plan 03.4).

---

## Source Inventory

From `ls legacy-monorepo/scripts/`:

| Path | Kind | Destination |
|------|------|-------------|
| `cli.ts` | Entry dispatcher | `./tomato-cli/src/cli.ts` (rewritten with root detection) |
| `dependencies/` | Command dir (tree.ts + utils) | `./tomato-cli/src/commands/dependencies/` |
| `event/` | Command dir | `./tomato-cli/src/commands/event/` |
| `linear/` | Command dir | `./tomato-cli/src/commands/linear/` |
| `ralph/` | Command dir | `./tomato-cli/src/commands/ralph/` |
| `utils/` | Shared helpers | `./tomato-cli/src/utils/` |
| `bootstrap-instincts.*` | Loose scripts | **Dropped** (per clarification #7, not project-specific) |
| `check-react-single-version.sh` | Loose script | **Dropped** |
| `sync-agent.*` | Loose scripts | **Dropped** |
| `tasks.ts` | Loose script | **Dropped** |

**Note:** any loose script deemed worker-related was already absorbed into `task-worker` in Plan 03.4. The CLI inherits only the four subcommand dirs + shared utils.

---

## Target Layout

```
./tomato-cli/
├── .github/workflows/
│   ├── ci.yml
│   └── publish.yml              # DISABLED header
├── src/
│   ├── cli.ts                   # entrypoint: tomato <tool> <command> [...args]
│   ├── root.ts                  # repo-root detection (walk parents)
│   ├── utils/
│   └── commands/
│       ├── dependencies/
│       ├── event/
│       ├── linear/
│       └── ralph/
├── tests/
│   └── root.test.ts
├── bin/
│   └── tomato.ts                # shebang wrapper -> ../src/cli.ts
├── AGENTS.md
├── README.md
├── eslint.config.mjs
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Steps

### Step 06.1 — Wipe scaffolded subdirs and seed package.json
**Actions:**
1. Remove existing `./tomato-cli/{dependencies,event,linear,ralph}/` (they contain only node_modules from an earlier experiment).
2. Overwrite `./tomato-cli/package.json`:
   ```json
   {
     "name": "@open-tomato/tomato-cli",
     "version": "0.1.0",
     "type": "module",
     "description": "Open Tomato general-purpose CLI",
     "bin": { "tomato": "./bin/tomato.ts" },
     "exports": { ".": "./src/cli.ts" },
     "scripts": {
       "build": "tsc --noEmit",
       "check-types": "tsc --noEmit",
       "dev": "bun run bin/tomato.ts",
       "lint": "eslint --fix",
       "test": "bun x vitest run"
     },
     "dependencies": {
       "@open-tomato/logger": "file:../packages/shared/logger",
       "@open-tomato/errors": "file:../packages/shared/errors"
     },
     "devDependencies": {
       "@open-tomato/eslint-config": "file:../packages/shared/eslint-config",
       "@open-tomato/typescript-config": "file:../packages/shared/typescript-config",
       "@types/node": "^22",
       "eslint": "^9.39.4",
       "typescript": "^5.9.3",
       "vitest": "^3.0.6"
     },
     "engines": { "node": ">=18", "bun": ">=1.3" }
   }
   ```
3. `bun install` — verify resolution.

**Commit:** `chore(tomato-cli): wipe scaffold stubs and seed package.json`

---

### Step 06.2 — Copy command directories
**Actions:**
1. `cp -R legacy-monorepo/scripts/dependencies tomato-cli/src/commands/dependencies`
2. Same for `event`, `linear`, `ralph`.
3. `cp -R legacy-monorepo/scripts/utils tomato-cli/src/utils`.
4. Update any local relative imports (e.g., `../utils` may resolve fine; `../../utils` etc. may need retargeting).

**Commit:** `refactor(tomato-cli): copy command directories from legacy scripts`

---

### Step 06.3 — Rewrite `cli.ts` with repo-root detection
**Goal:** the CLI works whether invoked inside or outside the monorepo. Commands that need repo context call `resolveRepoRoot()`; pure commands (e.g., `event listen`) do not.

**Actions:**
1. Write `src/root.ts` exporting `resolveRepoRoot(startDir = process.cwd()): string | null`:
   - Walk parents from `startDir`.
   - Return the first directory containing a `package.json` with a `"workspaces"` field, OR a file named `.open-tomato-root`.
   - Return `null` if none found.
2. Write `src/cli.ts`:
   - Parse `[,, tool, command, ...args]`.
   - Compute `__dirname` via `import.meta.url` — resolve against the CLI's own install location, not cwd.
   - `import(resolve(__dirname, 'commands', tool, `${command}.ts`))`.
   - Await `commandModule.default(args, { repoRoot: resolveRepoRoot() })`.
3. Update each command signature incrementally to accept the second `{ repoRoot }` arg. For commands that don't need it, the arg is a no-op.
4. Create `bin/tomato.ts` (shebang `#!/usr/bin/env bun`) that just re-exports `../src/cli.ts`.
5. Tests: `tests/root.test.ts` covers walk-up behavior with a temp-dir workspace marker.

**Commit:** `feat(tomato-cli): add repo-root detection and rewrite dispatcher`

---

### Step 06.4 — Standalone install/run smoke test
**Actions:**
1. `bun install -g .` from `./tomato-cli/` — expect `tomato` on PATH.
2. `tomato event listen --help` (or equivalent) prints usage without crashing.
3. `cd /tmp && tomato dependencies tree` either runs or emits a clean "not in an open-tomato repo" error (exit 2).
4. Document the expected error text in `README.md`.

**Commit:** `test(tomato-cli): document standalone-install smoke flow`

---

### Step 06.5 — `bunx`/`npx` usage
**Actions:**
1. Verify `bunx --bun /Users/marcos/projects/open-tomato/tomato-cli event listen` works end-to-end (without global install).
2. Add a section to `README.md` with all three invocation styles: global, `bunx`, `npx`.

**Commit:** `docs(tomato-cli): document bunx and npx invocation`

---

### Step 06.6 — Disabled publish workflow
**Actions:**
1. `.github/workflows/publish.yml` with commented `on:` block and a header `# DISABLED: enable when npm org registry is configured.` Publishes `@open-tomato/tomato-cli` with `--access public` when tag pushed.

**Commit:** `ci(tomato-cli): add disabled publish workflow stub`

---

### Step 06.7 — Docs
**Actions:**
1. `README.md` — what the CLI is, install/run, command index (auto-generated or hand-written list), repo-root detection, adding new commands.
2. `AGENTS.md` — brief, points to umbrella AGENTS.
3. `CONTRIBUTING.md` — how to add a command (drop `commands/<tool>/<command>.ts` with a `default export` function).

**Commit:** `docs(tomato-cli): author README, AGENTS, CONTRIBUTING`

---

### Step 06.8 — Gate
**Actions:**
1. `cd tomato-cli && bun install && bun lint && bun run test && bun run check-types`.

---

## Completion Criteria
- [ ] `tomato-cli/` is a self-contained package with no workspace-root coupling.
- [ ] `bun install -g .` and `bunx` both work.
- [ ] Every command reachable by `tomato <tool> <command>`.
- [ ] Root detection handles both inside-repo and outside-repo invocation.
- [ ] Tests for root detection pass.
- [ ] Disabled publish workflow in place.
- [ ] Docs explain install, invocation styles, adding commands.

## Exit
Proceed to [07-skills-and-docs.md](./07-skills-and-docs.md).
