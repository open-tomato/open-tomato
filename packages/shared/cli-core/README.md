# @open-tomato/cli-core

Pure TypeScript contracts (`CliContext`, `CliCommand`, `CliEvent`, `CliOutput`, `ArgSpec`, `FlagSpec`) plus the `assembleContext` runtime helper that every `tomato` / `tomatops` command consumer depends on.

## Purpose

`cli-core` is the foundation of the Open Tomato CLI surface. It defines the shape of a command invocation (`CliContext`) and the discriminated event stream (`CliEvent`) that flows between the CLI and any downstream renderer — the human-readable text renderer, the NDJSON renderer used by tooling and the Grow Box TUI (mirrored in Rust). Downstream packages (`@open-tomato/cli-structured-output`, `@open-tomato/cli-external-discovery`, `@open-tomato/platform-core`) and every command module import from here.

The package contains **no command source code** (consumers implement commands) and **no business logic** beyond argv parsing and output gating. The `CliEvent` union is intentionally serialization-friendly: a string-literal `type` discriminator, no class instances, ISO-8601 strings instead of `Date` objects.

## Installation

This is a workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@open-tomato/cli-core": "workspace:^"
  }
}
```

## Public exports

| Export | Kind | Purpose |
|---|---|---|
| `CliContext` | type | Frozen per-invocation context (args, flags, output mode, verbosity, output sink, abort signal, env). |
| `CliCommand` | type | Declarative command definition: `name`, `description`, `args`, `flags`, `run(ctx)`. |
| `CliOutput` | type | Output sink interface: `info`, `warn`, `error`, `debug`, `emit(event)`, `result(payload)`. |
| `CliEvent` | type | Discriminated union: `start \| step \| log \| result`. Stable wire format for text/JSON/TUI renderers. |
| `ArgSpec`, `FlagSpec` | type | Schema for positional args and flags consumed by a `CliCommand`. |
| `assembleContext` | fn | Parses argv, resolves output mode and verbosity, instantiates a `CliOutput`, returns a frozen `CliContext`. |
| `parseArgs` | fn | Lower-level argv parser (`{ positional, flags }`). |
| `createTextOutput` | fn | Verbosity-gated human-readable `CliOutput`. |
| `createJsonOutput` | fn | NDJSON `CliOutput` — one `CliEvent` per line. |

## Output mode resolution

`assembleContext` resolves `outputMode` with this precedence:

1. `forceOutputMode` argument (programmatic override)
2. `--output=json` flag on argv
3. `TOMATO_OUTPUT=json` environment variable
4. Default: `'text'`

Verbosity is resolved from `-v` / `--verbose` (repeatable, clamped to `0..3`) and `TOMATO_VERBOSITY`.

## Usage

### Assemble a `CliContext` and run a command

```ts
import { assembleContext, type CliCommand } from '@open-tomato/cli-core';

const validate: CliCommand = {
  name: 'svc validate',
  description: 'Validate a service manifest',
  args: [{ name: 'path', description: 'Manifest path', type: 'string', required: true }],
  flags: [{ name: 'strict', description: 'Fail on warnings', type: 'boolean', default: false }],
  async run(ctx) {
    ctx.output.emit({ type: 'start', command: 'svc validate', ts: new Date().toISOString() });
    ctx.output.info(`Validating ${ctx.args[0]}`);

    if (ctx.signal.aborted) return;

    ctx.output.result({ ok: true });
  },
};

const ctx = assembleContext({
  argv: process.argv.slice(2),
  env: process.env,
});

await validate.run(ctx);
```

### Force JSON output (e.g. when invoked by the Grow Box TUI)

```ts
const ctx = assembleContext({
  argv: process.argv.slice(2),
  env: process.env,
  forceOutputMode: 'json',
});
```

Every `ctx.output.*` call now emits one NDJSON `CliEvent` per line — safe to parse line-by-line on the consumer side.

### Inspect the context

```ts
ctx.args;        // readonly string[] — positional args after flag stripping
ctx.flags;       // Readonly<Record<string, string | boolean>>
ctx.outputMode;  // 'text' | 'json'
ctx.verbosity;   // 0 | 1 | 2 | 3
ctx.signal;      // AbortSignal — defaults to a fresh AbortController().signal
ctx.env;         // Readonly<Record<string, string | undefined>>
```

The returned context is `Object.freeze`d; consumers cannot mutate it.

## `CliEvent` shape

```ts
type CliEvent =
  | { type: 'start';  command: string; ts: string }
  | { type: 'step';   name: string;    ts: string }
  | { type: 'log';    level: 'debug' | 'info' | 'warn' | 'error'; message: string; ts: string }
  | { type: 'result'; ok: boolean; data?: unknown; error?: { code: string; message: string }; ts: string };
```

All variants are pure data: no classes, no `Date`, no functions. The Grow Box TUI mirrors this union in Rust, so any addition here is a wire-format change.

## Notes

- Pure TypeScript. No build step. The package exposes `src/index.ts` directly via workspace exports.
- No runtime dependencies. `@types/node` is dev-only for `AbortSignal` / `process.env` typing.
- Argv parsing supports `--flag=value`, `--flag value`, `--flag`, `--no-flag`, `-f value`, `-f=value`, and `--` end-of-flags. Repeated flags: last one wins.
