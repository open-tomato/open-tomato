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
3. **Repo-root detection is centralised.** Use `resolveRepoRoot()` from
   `src/root.ts` whenever a command needs workspace context. Do not
   re-implement the walk-up inside individual commands.
4. **Dispatcher-level tests live under `tests/`.** They run by default.
   Command-level tests under `src/commands/**/tests/` are intentionally
   excluded from the default `vitest` include — see `vitest.config.ts`.
   Fix legacy command tests ad-hoc when touching the command, not as
   part of unrelated work.
5. **Shared packages via `file:` refs.** `@open-tomato/logger`,
   `@open-tomato/linear`, etc. are linked by path. Adopters who detach
   the CLI from this umbrella must switch to published semver or GitHub
   refs — see the README's publishing section.
6. **Verify before commit.** `bun install && bun lint && bun run test &&
   bun run check-types` must stay green.

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
