# Plan: cli external command discovery

## Description

Extend the `cli/` package (published as `@open-tomato/tomato-cli`, `private: true`) with external command discovery. The shipped dispatcher today only finds commands under `cli/src/commands/`. The Grow Box `svc validate/generate/reconcile/list` modules live in `grow-box/tools/commands/`, outside the CLI's own tree, so the dispatcher must walk up from `process.cwd()` looking for a `.open-tomato-root` marker file, then read the marker's sibling `package.json` for an `ot.commands` field listing command-module paths to load at runtime.

The discovery mechanism caches the resolved external command list per process (no hot reload) and handles three failure modes gracefully: missing marker (skip — internal commands still work), malformed `ot.commands` manifest (log a warning, skip — internal commands still work), individual module load failure (log a warning naming the module, skip the module, continue). External commands appear in `tomato describe` output and route through the same dispatch path as internal ones. Discovery happens once, at dispatcher startup, before the first command resolution.

The `package.json` extension:

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

Files added to `cli/`: `cli/src/discovery/findRoot.ts`, `cli/src/discovery/loadManifest.ts`, `cli/src/discovery/loadExternalCommands.ts`, `cli/src/discovery/index.ts`. Files modified: `cli/src/registry.ts` (accept external commands), `cli/src/dispatch.ts` (trigger discovery on startup), `cli/AGENTS.md`.

# Stage: Root marker walker

- [x] Write `cli/src/discovery/findRoot.ts` exporting `findOpenTomatoRoot(startDir: string): string | null` that walks parent directories looking for `.open-tomato-root`
- [x] Stop the walk at the filesystem root (return null) rather than crossing the boundary
- [x] Return the directory containing the marker (not the marker path itself)
- [x] Write `cli/src/discovery/findRoot.test.ts` covering: marker in the start dir, marker three levels up, no marker found (returns null), symlinked directories handled correctly
- [x] Add a test asserting `findOpenTomatoRoot('/')` returns null without throwing

# Stage: Manifest loader

- [x] Write `cli/src/discovery/loadManifest.ts` exporting `loadManifest(rootDir: string): { commands: Array<{ tool: string; command: string; module: string }> } | null`
- [x] Implement reading `<rootDir>/package.json`, parsing JSON, extracting the `ot.commands` field, and validating each entry has `tool`, `command`, `module` string fields
- [x] Return null when `package.json` is missing or `ot.commands` is absent
- [x] Log a warning via `console.warn` and return null when `ot.commands` exists but is malformed (not an array, missing required fields)
- [x] Resolve each `module` path relative to `rootDir`, producing absolute paths
- [x] Write `cli/src/discovery/loadManifest.test.ts` covering: well-formed manifest, missing `ot.commands` (returns null), malformed `ot.commands` (returns null with warning), non-array `ot.commands` (returns null with warning), missing fields in an entry (entry skipped, others kept)

# Stage: External command loader

- [x] Write `cli/src/discovery/loadExternalCommands.ts` exporting `loadExternalCommands(manifest, rootDir): Promise<Array<{ tool, command, module: CommandModule }>>`
- [x] Use dynamic `import()` to load each module path, swallowing individual load errors with a `console.warn` naming the failing module path
- [ ] Validate each loaded module has either a `default` export (legacy shape) or `meta` + `default` (new shape); skip with warning if neither
- [ ] Cache results by `rootDir` so repeat calls in the same process do not re-load
- [ ] Write `cli/src/discovery/loadExternalCommands.test.ts` covering: all modules load, one module throws on import (others still load), one module has no valid exports (others still load), cache returns the same array reference on second call
- [ ] Add an integration test using a temp directory with a real `.open-tomato-root` and a synthetic `package.json` + module files

# Stage: Registry and dispatch integration

- [ ] Update `cli/src/discovery/index.ts` to re-export `findOpenTomatoRoot`, `loadManifest`, `loadExternalCommands`
- [ ] Update `cli/src/registry.ts` to accept an optional `externalCommands` array in the constructor and merge them into the lookup table after internal commands
- [ ] When an external command shares a `tool/command` key with an internal one, prefer the internal (and emit a `console.warn` about the conflict)
- [ ] Update `cli/src/dispatch.ts` to call `findOpenTomatoRoot(process.cwd())` → `loadManifest` → `loadExternalCommands` once at startup, passing results to the registry
- [ ] When discovery finds no root, the dispatcher proceeds normally with internal commands only
- [ ] Write a test in `cli/src/dispatch.test.ts` asserting that external commands are dispatched correctly when discovery succeeds
- [ ] Write a test asserting that startup with no `.open-tomato-root` still runs internal commands without errors

# Stage: Documentation

- [ ] Update `cli/AGENTS.md` to document the `.open-tomato-root` marker convention and the `ot.commands` manifest shape
- [ ] Document the three failure modes and their fallback behavior in `cli/AGENTS.md`
- [ ] Add a worked example to `cli/README.md` showing a consumer repo with a marker file and a manifest entry
