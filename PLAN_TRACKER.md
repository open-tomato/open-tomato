# Plan: cli structured-output adoption

## Description

Refactor the `cli/` package (published as `@open-tomato/tomato-cli`, `private: true`) to adopt `@open-tomato/cli-core`. The current dispatcher in `cli/src/cli.ts` calls each command's bare `default(args, ctx)` with a minimal `CommandContext` (`{ repoRoot }`). The new dispatcher assembles a full `CliContext` via `assembleContext`, gates output by `--output=json` / `TOMATO_OUTPUT=json`, emits NDJSON `CliEvent`s for long-running commands, and registers a new `tomato describe` command that walks the command tree and emits the documented JSON shape with `schemaVersion: 1`.

This is a runtime change for the CLI but a contract change for command modules: existing commands keep working through a thin shim (`runLegacyCommand`) but new and migrated commands receive `CliContext` directly and declare `ArgSpec`/`FlagSpec` metadata so `describe` can serialize them. The `cli/` package stays private — these changes ship as part of the `phase-8-registry-cut` initiative, not on their own.

The `describe` output shape (versioned by `schemaVersion`):

```json
{
  "schemaVersion": 1,
  "binary": "tomato",
  "version": "0.2.0",
  "commands": [
    { "tool": "linear", "command": "next", "description": "...", "args": [...], "flags": [...] }
  ]
}
```

Files modified: `cli/src/cli.ts` (dispatcher rewrite), `cli/package.json` (add `@open-tomato/cli-core` dep), `cli/AGENTS.md` (update golden rules). New files: `cli/src/dispatch.ts`, `cli/src/registry.ts`, `cli/src/legacyShim.ts`, `cli/src/commands/describe.ts`.

# Stage: Wire cli-core

- [x] Add `@open-tomato/cli-core: workspace:^` to `cli/package.json` dependencies
- [x] Run `bun install` at the repo root to link the new dependency
- [x] Update `cli/tsconfig.json` if needed so `@open-tomato/cli-core` resolves correctly under the workspace
- [x] Write `cli/src/legacyShim.ts` exporting `runLegacyCommand(ctx: CliContext, mod: { default: Function })` that builds a `CommandContext`-shape adapter from `CliContext` (`repoRoot` from `resolveRepoRoot`) and invokes the module's default export with `ctx.args`
- [x] Write `cli/src/legacyShim.test.ts` verifying the shim passes `args` and resolves `repoRoot` correctly, and that thrown errors propagate as rejected promises

# Stage: Command registry

- [ ] Write `cli/src/registry.ts` exporting `CommandRegistry` class with methods `register(tool, command, module)`, `get(tool, command)`, `list(): Array<{ tool, command, meta }>`
- [ ] Implement filesystem-based auto-registration in `registry.ts` that scans `cli/src/commands/<tool>/<command>.ts` at construction time
- [ ] Extend module shape so a command file may export `meta: CliCommand` (description, args, flags) in addition to `default`
- [ ] Write `cli/src/registry.test.ts` verifying: registry discovers known commands, returns null for unknown commands, `list()` includes metadata when present and falls back to inferred name when absent
- [ ] Add a test in `cli/src/registry.test.ts` asserting registry handles missing `commands/<tool>/` directories without throwing

# Stage: Dispatcher

- [ ] Write `cli/src/dispatch.ts` exporting `dispatch(argv: string[]): Promise<number>` that uses `assembleContext` and the registry to route a command, returning a numeric exit code
- [ ] Replace the body of `cli/src/cli.ts` `main()` with a call to `dispatch(argv)` followed by `process.exit(code)`
- [ ] Preserve the existing `tomato <tool> <command>` positional shape — tool and command are the first two positional args after the binary name
- [ ] Emit a `start` `CliEvent` before invoking the command and a `result` `CliEvent` after the command resolves or rejects
- [ ] Map thrown errors to exit code 1 and `result: { ok: false, error: { code, message } }`
- [ ] When the command module lacks `meta`, route through `runLegacyCommand`; when `meta` is present, call the module's `default(ctx)` directly with the `CliContext`
- [ ] Write `cli/src/dispatch.test.ts` covering: unknown command exits 1 with `result` event, known legacy command runs through shim, known meta-aware command receives `CliContext`, NDJSON output mode emits events to stdout as one-per-line JSON
- [ ] Add a test asserting `TOMATO_OUTPUT=json` env var triggers JSON mode without the `--output=json` flag

# Stage: describe command

- [ ] Write `cli/src/commands/describe.ts` exporting a `meta: CliCommand` describing the describe command and a `default(ctx: CliContext)` implementation
- [ ] Implement the describe command to read the registry, walk every registered command, collect `{ tool, command, description, args, flags }`, and emit a `result` event with the full tree
- [ ] Include `schemaVersion: 1`, `binary: 'tomato'`, and the version from `cli/package.json` in the result payload
- [ ] In text mode, render the same tree as a human-readable list grouped by tool
- [ ] Write `cli/src/commands/describe.test.ts` asserting the JSON output matches the documented shape and that `schemaVersion` is `1`
- [ ] Add a test asserting that adding a new command file with `meta` makes it appear in the describe output

# Stage: Documentation

- [ ] Update `cli/AGENTS.md` to reflect the new dispatcher shape: commands may export `meta` plus `default(ctx: CliContext)`; legacy commands continue to work via the shim
- [ ] Document the `--output=json` / `TOMATO_OUTPUT=json` flag and the NDJSON event stream in `cli/AGENTS.md`
- [ ] Document the `tomato describe` command and the `schemaVersion: 1` contract in `cli/AGENTS.md`
- [ ] Update `cli/README.md` with a short example showing a command that exports `meta` and consumes `ctx.output.emit`
