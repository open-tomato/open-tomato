# tomato-cli — agent notes

Standalone CLI for the open-tomato ecosystem. Umbrella conventions live
in [../AGENTS.md](../AGENTS.md); read it first for commit format, package
linking policy, and refactor deletion rules.

## Golden rules for edits to this folder

1. **Commands are file-scoped.** Each command is one file under
   `src/commands/<tool>/<command>.ts`. Two shapes are supported, and the
   dispatcher picks between them based on whether the module exports
   `meta`:

   - **Meta-aware (preferred for new commands).** Export `meta: CliCommand`
     from `@open-tomato/cli-core` (name, description, `args: ArgSpec[]`,
     `flags: FlagSpec[]`, `run`) alongside a `default(ctx: CliContext)`
     async function. The dispatcher invokes `default(ctx)` directly — no
     adapter — so commands consume `ctx.args`, `ctx.flags`,
     `ctx.outputMode`, and `ctx.output.emit` from `CliContext`. `meta` is
     what `tomato describe` walks to produce its tree, so keep it
     accurate. See `src/commands/describe.ts` for the canonical shape.
   - **Legacy.** Export only `default` with the original
     `(args: string[], ctx: { repoRoot: string | null }) => Promise<void>`
     signature. The dispatcher detects the missing `meta` and routes
     through `runLegacyCommand` (`src/legacyShim.ts`), which builds the
     `{ repoRoot }` adapter via `resolveRepoRoot()` and forwards
     `ctx.args`. Existing commands keep working unchanged; migrate to
     the meta-aware shape when you next touch one.
2. **Output mode is driven by `--output=json` / `TOMATO_OUTPUT=json`.**
   `assembleContext` (`@open-tomato/cli-core`) resolves `ctx.outputMode`
   from the `--output=<mode>` flag first, then the `TOMATO_OUTPUT` env
   var, defaulting to `'text'`. In `json` mode, `ctx.output` is the
   NDJSON writer from `createJsonOutput`: every call to `emit`, `info`,
   `warn`, `error`, `debug`, or `result` writes exactly one
   `JSON.stringify(event)\n` line to stdout, so consumers can read
   stdout as line-delimited JSON. The dispatcher itself emits a `start`
   `CliEvent` before invoking the command and a `result` event after it
   resolves or rejects (`{ ok: true }` on success, `{ ok: false, error:
   { code, message } }` on failure). Commands may emit additional
   `step` or `log` events through `ctx.output.emit` for long-running
   work — keep payloads JSON-serialisable, since the JSON writer calls
   `JSON.stringify` on each event. In `text` mode the same events are
   rendered as prefixed lines (`start: ...`, `result: ok`,
   `result: error <code>: <message>`, etc.); commands whose primary
   text output is human-readable must branch on
   `ctx.outputMode === 'text'` and write to `process.stdout.write`
   directly (see `src/commands/describe.ts`). Never mix raw
   `console.log` output with NDJSON — it corrupts the stream for
   programmatic consumers.
3. **`tomato describe` is the registry's machine-readable manifest.**
   The describe command (`src/commands/describe.ts`) walks the
   `CommandRegistry`, collects every command's `meta`, and emits the
   tree. In `json` mode it sends a single `result` `CliEvent` whose
   `data` payload conforms to the stable contract:

   ```json
   {
     "schemaVersion": 1,
     "binary": "tomato",
     "version": "<cli/package.json version>",
     "commands": [
       {
         "tool": "<tool>",
         "command": "<command>",
         "description": "<meta.description, or ''>",
         "args": [/* ArgSpec[] from meta, or [] */],
         "flags": [/* FlagSpec[] from meta, or [] */]
       }
     ]
   }
   ```

   `schemaVersion: 1` is the integration contract — external consumers
   (registry tooling, docs generators, IDEs) key off it, so treat any
   breaking change (renaming/removing fields, changing the `binary` or
   `schemaVersion` literal, narrowing existing field types) as a new
   `schemaVersion`. Additive, backwards-compatible fields (new optional
   keys on a command entry, new top-level keys) can land at the same
   version. Legacy commands without `meta` still appear in the output,
   but with empty `description` / `args` / `flags` — migrate them to
   the meta-aware shape to surface real metadata. In `text` mode the
   same tree renders as a plain list grouped by tool (`<tool>:` header
   followed by `  <command>: <description>` entries), written directly
   via `process.stdout.write` per the rule-2 caveat about
   human-readable text output.
4. **Repo-root detection is centralised.** Use `resolveRepoRoot()` from
   `src/root.ts` whenever a command needs workspace context. Do not
   re-implement the walk-up inside individual commands.
5. **Dispatcher-level tests live under `tests/`.** They run by default.
   Command-level tests under `src/commands/**/tests/` are intentionally
   excluded from the default `vitest` include — see `vitest.config.ts`.
   Fix legacy command tests ad-hoc when touching the command, not as
   part of unrelated work.
6. **Shared packages via `file:` refs.** `@open-tomato/logger`,
   `@open-tomato/linear`, etc. are linked by path. Adopters who detach
   the CLI from this umbrella must switch to published semver or GitHub
   refs — see the README's publishing section.
7. **Verify before commit.** `bun install && bun lint && bun run test &&
   bun run check-types` must stay green.

## External command discovery

Beyond the commands shipped under `src/commands/` (rule 1), the
dispatcher loads command modules contributed by the surrounding
consumer repository at runtime. Discovery hinges on two conventions: a
`.open-tomato-root` marker file and an `ot.commands` entry in the
sibling `package.json`. The wiring lives in `src/discovery/` and is
triggered from `src/dispatch.ts` before the first command resolution.

**The marker.** On startup the dispatcher walks parent directories
upward from `process.cwd()` looking for a file literally named
`.open-tomato-root` (`src/discovery/findRoot.ts`). The walk stops at
the filesystem root. When the marker is found, the function returns
its *containing directory* — not the marker path itself — and that
directory is treated as the consumer root for resolving sibling files
(notably `package.json`). The marker file's contents are not read; only
its presence and location matter, so it can be empty.

**The manifest.** External commands are declared under `ot.commands`
in the consumer repo's `<rootDir>/package.json`:

```json
{
  "name": "grow-box-tools",
  "ot": {
    "commands": [
      { "tool": "svc", "command": "validate", "module": "./tools/commands/svc/validate.ts" },
      { "tool": "svc", "command": "generate", "module": "./tools/commands/svc/generate.ts" }
    ]
  }
}
```

Each entry needs three non-empty string fields:

- `tool` and `command` form the lookup key matching the user-facing
  `tomato <tool> <command>` invocation.
- `module` is a path that `loadManifest`
  (`src/discovery/loadManifest.ts`) resolves to an absolute path
  *relative to the marker directory*, then `loadExternalCommands`
  (`src/discovery/loadExternalCommands.ts`) dynamically imports via
  `import(pathToFileURL(absolute).href)`.

The loaded module must export a callable `default` — and optionally
`meta` — matching the same two shapes documented in rule 1. External
commands route through the same `default(ctx)` call path as internal
ones and surface in `tomato describe` output alongside them.

**Lifecycle.** Discovery is run once per process, before the registry
resolves the first command. `loadExternalCommands` caches its result by
`rootDir` so repeat dispatches inside the same process reuse the
loaded modules instead of re-importing — there is no hot reload, and a
running process will not pick up a freshly-edited consumer module
without a restart.

## Known caveats

- **Legacy command tests are excluded from vitest** pending ad-hoc
  fixes. The files under `src/commands/ralph/tests/` were copied over
  from `legacy-monorepo/scripts/ralph/tests/` and still rely on
  infrastructure (process.exit stubs, mock filesystem setup) that needs
  updating to pass under the unified CLI harness.
- **Two latent type errors were fixed in-place during migration**
  (`commands/event/interact.ts` parameter annotation,
  `commands/ralph/effort-collect.ts` null→undefined coercion). Prefer
  this pattern — fix where you find it — over loosening `tsconfig.json`.
