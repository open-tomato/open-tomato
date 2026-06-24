# Plan: cli-core types and assembleContext

## Description

`@open-tomato/cli-core` is the contract package every `tomato`/`tomatops` command consumer depends on. It ships pure TypeScript types (`CliContext`, `CliCommand`, `CliOutput`, `ArgSpec`, `FlagSpec`, `CliEvent`) plus a single runtime helper `assembleContext({ argv, env, forceOutputMode })` that parses argv, resolves the output mode (`text`/`json` via `--output=json` or `TOMATO_OUTPUT=json`), instantiates a verbosity-gated `CliOutput`, and returns a frozen `CliContext`.

This package is the foundation of Phase 8 — `cli-structured-output`, `cli-external-discovery`, `platform-core`, and every downstream command module (grow-box's `svc validate/generate/reconcile/list`, the future TUI engine adapter) all import from here. It MUST contain no command source code (consumers implement commands) and no business logic beyond argv parsing and output gating. The Grow Box TUI will mirror the `CliEvent` discriminated union in Rust, so the union must be stable and serialization-friendly: string-literal discriminator field `type`, no class instances, no `Date` objects (use ISO-8601 strings).

The shape of the core types (illustrative — final exact field set per implementation):

```ts
export interface CliContext {
  args: readonly string[];
  flags: Readonly<Record<string, string | boolean>>;
  outputMode: 'text' | 'json';
  verbosity: 0 | 1 | 2 | 3;
  output: CliOutput;
  signal: AbortSignal;
  env: Readonly<Record<string, string | undefined>>;
}

export type CliEvent =
  | { type: 'start'; command: string; ts: string }
  | { type: 'step'; name: string; ts: string }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; message: string; ts: string }
  | { type: 'result'; ok: boolean; data?: unknown; error?: { code: string; message: string }; ts: string };
```

Files created: `packages/shared/cli-core/package.json`, `tsconfig.json`, `eslint.config.mjs`, `README.md`, `src/types.ts`, `src/events.ts`, `src/output.ts`, `src/parseArgs.ts`, `src/assembleContext.ts`, `src/index.ts`, plus `*.test.ts` siblings.

# Stage: Package scaffold

- [ ] Create `packages/shared/cli-core/package.json` with name `@open-tomato/cli-core`, version `0.1.0`, `private: false`, `publishConfig.access: public`, `type: module`, `main: ./src/index.ts`, `exports: { ".": "./src/index.ts" }`, devDependencies on `@open-tomato/eslint-config` and `@open-tomato/typescript-config` (both `workspace:^`), `eslint`, `typescript`, `vitest`, `@types/node`
- [ ] Create `packages/shared/cli-core/tsconfig.json` extending `@open-tomato/typescript-config/base.json` with `include: ["src/**/*"]`
- [ ] Create `packages/shared/cli-core/eslint.config.mjs` re-exporting `@open-tomato/eslint-config`
- [ ] Create `packages/shared/cli-core/README.md` documenting the package purpose, public exports, and a `CliContext` usage example
- [ ] Run `bun install` at the repo root to register the new workspace member
- [ ] Create `packages/shared/cli-core/vitest.config.ts` with default config (no special setup)

# Stage: Types

- [ ] Write `src/types.ts` exporting `CliContext` interface with fields `args`, `flags`, `outputMode`, `verbosity`, `output`, `signal`, `env`
- [ ] Add `ArgSpec` and `FlagSpec` interfaces to `src/types.ts` with fields `name`, `description`, `type` (`'string' | 'boolean' | 'number'`), `required`, `default`, `aliases`
- [ ] Add `CliCommand` interface to `src/types.ts` with fields `name`, `description`, `args` (`ArgSpec[]`), `flags` (`FlagSpec[]`), `run` (function taking `CliContext` and returning `Promise<void>`)
- [ ] Write `src/events.ts` exporting the `CliEvent` discriminated union (`start`, `step`, `log`, `result`) with ISO-8601 string `ts` fields and no class instances
- [ ] Write `src/types.test.ts` with type-level assertions that `CliContext.outputMode` is the string literal union `'text' | 'json'` and that `CliEvent.type` narrows correctly via `if (e.type === 'log')`
- [ ] Write `src/events.test.ts` asserting that `JSON.stringify` of every `CliEvent` variant produces a round-trippable payload

# Stage: CliOutput

- [ ] Write `src/output.ts` exporting a `CliOutput` interface with methods `info`, `warn`, `error`, `debug`, `emit(event: CliEvent)`, `result(payload: unknown)`
- [ ] Implement `createTextOutput({ verbosity, stream })` in `src/output.ts` returning a `CliOutput` that writes human-readable lines, gates `debug` at verbosity >= 2 and `info` at verbosity >= 1
- [ ] Implement `createJsonOutput({ stream })` in `src/output.ts` returning a `CliOutput` that writes one NDJSON `CliEvent` per call (newline-terminated, no pretty-print)
- [ ] Write `src/output.test.ts` verifying that `createTextOutput` at verbosity 0 suppresses `debug` and `info` but emits `warn`/`error`/`result`
- [ ] Write a test in `src/output.test.ts` verifying that `createJsonOutput` produces exactly one JSON object per line and that the `result` call emits a `type: 'result'` event

# Stage: parseArgs

- [ ] Write `src/parseArgs.ts` exporting `parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string | boolean> }`
- [ ] Implement support for `--flag=value` syntax in `parseArgs`
- [ ] Implement support for space-separated `--flag value` syntax in `parseArgs`
- [ ] Implement support for boolean flags `--flag` (no value, sets `true`)
- [ ] Implement support for negation `--no-flag` (sets `false`)
- [ ] Implement support for short aliases `-f value` and `-f=value`
- [ ] Implement support for `--` end-of-flags marker, treating everything after as positional
- [ ] Write `src/parseArgs.test.ts` with cases: `--env=staging`, `--env staging`, `--verbose`, `--no-color`, `-v 2`, `-v=2`, mixed positional and flags, `--` separator
- [ ] Add an edge-case test in `src/parseArgs.test.ts` for repeated flags (last one wins) and missing value for non-boolean flag

# Stage: assembleContext

- [ ] Write `src/assembleContext.ts` exporting `assembleContext({ argv, env, forceOutputMode, signal })` returning a frozen `CliContext`
- [ ] Resolve `outputMode` in `assembleContext` with precedence: `forceOutputMode` arg > `--output=json` flag > `TOMATO_OUTPUT=json` env var > default `'text'`
- [ ] Resolve `verbosity` in `assembleContext` from `-v`/`--verbose` flag (repeatable count, clamp to 0..3) and `TOMATO_VERBOSITY` env var
- [ ] Instantiate the appropriate `CliOutput` based on resolved `outputMode` and `verbosity`
- [ ] Default `signal` to `new AbortController().signal` if not provided
- [ ] Wire `Object.freeze` on the returned `CliContext` so consumers cannot mutate it
- [ ] Write `src/assembleContext.test.ts` covering: text mode default, `--output=json` flag wins over env, `forceOutputMode` arg wins over both, verbosity clamping, frozen result
- [ ] Add a negative test in `src/assembleContext.test.ts` asserting that mutating the returned `flags` object throws in strict mode
- [ ] Write `src/index.ts` re-exporting all public types and `assembleContext`, `createTextOutput`, `createJsonOutput`, `parseArgs`

# Stage: Release

- [ ] Add a changeset describing the change: run `bunx changeset` and select `@open-tomato/cli-core` with a `minor` bump (new package, ships at `0.1.0`)
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
