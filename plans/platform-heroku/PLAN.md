# Plan: platform-heroku reference plugin

## Description

`@open-tomato/platform-heroku` is a reference implementation of `PlatformPlugin` from `@open-tomato/platform-core`, proving the interface is generic enough to support a vendor other than the Grow Box homelab. It implements two non-trivial pieces of Heroku-specific behavior: (1) instance-class allowance checking against Heroku dyno tiers (`hobby`, `standard-1x`, `standard-2x`, `performance-m`, `performance-l`) and (2) `app.json` emission from a resolved config. The plugin reads the `infrastructure.heroku` pot from schema v2 and emits a single `EmitTarget` (the `app.json` file) plus a content-hashed `lockHash`.

This initiative can develop in parallel with `config-schema-v2` (it only depends on `platform-core` types being stable). It is NOT on grow-box's critical path — grow-box uses `platform-growbox`, not Heroku. The purpose of shipping Heroku is to flush out design problems in `PlatformPlugin` before grow-box discovers them late, and to give external consumers a working second example. If Phase 8 ships behind schedule, this initiative can be deferred to a follow-up cut without blocking grow-box.

Files created: `packages/shared/platform-heroku/package.json`, `tsconfig.json`, `eslint.config.mjs`, `README.md`, `src/dynoTiers.ts`, `src/capabilities.ts`, `src/refs.ts`, `src/validate.ts`, `src/emitAppJson.ts`, `src/plugin.ts`, `src/index.ts`, plus `*.test.ts` siblings.

# Stage: Package scaffold

- [ ] Create `packages/shared/platform-heroku/package.json` with name `@open-tomato/platform-heroku`, version `0.1.0`, `private: false`, `publishConfig.access: public`, `type: module`, `main: ./src/index.ts`, dependencies on `@open-tomato/platform-core` (`workspace:^`), devDependencies on `@open-tomato/eslint-config` and `@open-tomato/typescript-config` (both `workspace:^`), `eslint`, `typescript`, `vitest`, `@types/node`
- [ ] Create `packages/shared/platform-heroku/tsconfig.json` extending `@open-tomato/typescript-config/base.json`
- [ ] Create `packages/shared/platform-heroku/eslint.config.mjs` re-exporting `@open-tomato/eslint-config`
- [ ] Create `packages/shared/platform-heroku/README.md` documenting the dyno tiers, allowance rules, and an example `app.json` emission
- [ ] Run `bun install` at the repo root to register the new workspace member
- [ ] Create `packages/shared/platform-heroku/vitest.config.ts` with default config

# Stage: Dyno tiers and capabilities

- [ ] Write `src/dynoTiers.ts` exporting `DYNO_TIERS` as a readonly array of objects with fields `name`, `memoryMb`, `cpuShare`, `priceUsdPerHour`
- [ ] Include the tiers `hobby`, `basic`, `standard-1x`, `standard-2x`, `performance-m`, `performance-l`, `performance-2xl` with their documented memory/cpu values
- [ ] Write `src/dynoTiers.test.ts` asserting the tier list is non-empty and that lookups by `name` return the expected memory values
- [ ] Write `src/capabilities.ts` exporting `matchCapabilities(request: ProvisionRequest): Promise<MatchResult>` that checks every requested capability against a `HEROKU_CAPABILITIES` set and returns a `MatchResult` with `missing` populated when any required capability is absent
- [ ] Define `HEROKU_CAPABILITIES` covering `http`, `tls`, `postgres-addon`, `redis-addon`, `scheduler`, `worker-dyno`, `release-phase`
- [ ] Write `src/capabilities.test.ts` covering: all capabilities present (matches true, score 1.0), one missing (matches false, missing list populated), unknown capability (treated as missing)

# Stage: Refs and validation

- [ ] Write `src/refs.ts` exporting `resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string>` that resolves `{{platform.heroku.<path>}}` references against `ctx.infrastructure.heroku`
- [ ] Pass through any non-heroku platform refs untouched (so other plugins can run after)
- [ ] Throw a typed error when a heroku ref points at a missing path (do NOT silently substitute empty string)
- [ ] Write `src/refs.test.ts` covering: single heroku ref resolves, multiple refs in one template, non-heroku ref preserved, missing path throws
- [ ] Write `src/validate.ts` exporting `validateProvision(request, allowance): Promise<ValidationResult>` that enforces: instance class is one of `DYNO_TIERS.name`; if `request.capabilities` includes `postgres-addon`, allowance must include a postgres plan name; reject `performance-l` for `hobby` tier accounts (require explicit `tierOverride`)
- [ ] Write `src/validate.test.ts` covering: valid request, invalid dyno class (error), missing postgres plan when addon requested (error), `performance-l` without override (error), `performance-l` with override (passes)

# Stage: emit app.json

- [ ] Write `src/emitAppJson.ts` exporting `emitAppJson(config: ResolvedConfig): { content: string; lockHash: string }`
- [ ] Build the `app.json` document with fields `name`, `description`, `keywords`, `repository`, `env`, `formation`, `addons`, `buildpacks` sourced from `config.infrastructure.heroku` and `config.service`
- [ ] Compute `lockHash` as the SHA-256 hex digest of the canonical-JSON-serialized content
- [ ] Use stable key ordering in the JSON serialization so `lockHash` is deterministic across runs
- [ ] Write `src/emitAppJson.test.ts` asserting: same input produces same `lockHash`, reordering input keys still produces same hash, missing required fields produces an emit error
- [ ] Add a fixture test in `src/emitAppJson.test.ts` against `tests/fixtures/sample-heroku-config.yaml` asserting the emitted `app.json` matches a golden file byte-for-byte

# Stage: Plugin assembly

- [ ] Write `src/plugin.ts` exporting `createHerokuPlugin(opts?: { tierOverride?: boolean }): PlatformPlugin` that wires the four methods into a single object satisfying `PlatformPlugin`
- [ ] Implement `emit(config)` to return `{ targets: [{ kind: 'file', path: 'app.json', content: <emitted>, mode: 0o644 }], lockHash }`
- [ ] Write `src/plugin.test.ts` asserting the returned plugin structurally satisfies `PlatformPlugin` and that each method round-trips through `createHerokuPlugin`
- [ ] Add an end-to-end test in `src/plugin.test.ts` that calls all four methods in sequence against a fixture config and verifies the final `EmitResult`
- [ ] Write `src/index.ts` re-exporting `createHerokuPlugin`, `DYNO_TIERS`, `HEROKU_CAPABILITIES`

# Stage: Release

- [ ] Add a changeset describing the change: run `bunx changeset` and select `@open-tomato/platform-heroku` with a `minor` bump (new package, ships at `0.1.0`)
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
