# Plan: config schema v2 extension

## Description

Extend the existing `@open-tomato/config` package (at `packages/shared/config/`) with the schema v2 features required by Phase 8 platform plugins. This is an extension — not a fork. The Phase 7 fixture `samples/knowledge-base/service.config.yaml` (in grow-box) must continue to validate after the change. Schema v2 adds four capabilities:

1. **`{{platform.<vendor>.*}}` syntax** — left unresolved by the loader and passed through to the platform plugin's `resolvePlatformRefs` method at emit-time. The loader must recognize the syntax, NOT attempt to resolve it, and preserve the literal string in the resolved config.
2. **`infrastructure.<vendor>` pot convention** — a top-level pot keyed by vendor name (`homelab`, `heroku`, etc.) whose schema is opened via `defineConfig` extensions per plugin.
3. **`provision` object coercion** — accept `provision: true`, `provision: false`, or `provision: { ... }` at the service level. `true` becomes `{}` (default allowance), `false` becomes `{ disabled: true }`, absent becomes `undefined`. The plugin's `validateProvision` reads the coerced object.
4. **`project.owner` soft-required field** — string field on `project`. Soft-required: emits a `warning` (not an `error`) in `ValidationResult` when absent. `loadConfig` returns the warnings alongside the resolved config.

Files modified: `packages/shared/config/src/schema.ts` (extend `BaseConfigSchema`, add `ProvisionSchema`, add `InfrastructureSchema`), `packages/shared/config/src/loader.ts` (add platform-ref recognition, pass-through), `packages/shared/config/src/index.ts` (export new symbols). New file: `packages/shared/config/src/platformRefs.ts`. Test fixtures added under `packages/shared/config/tests/fixtures/`.

# Stage: Provision schema

- [x] Write `src/provision.ts` exporting `ProvisionSchema` Zod schema as a discriminated union of `z.literal(true)`, `z.literal(false)`, `z.object({ ... })` with optional fields `disabled`, `caps`, `metadata`
- [x] Implement `coerceProvision(input: unknown): ProvisionObject` in `src/provision.ts` that normalizes `true` → `{}`, `false` → `{ disabled: true }`, undefined → `undefined`, and passes through validated objects
- [ ] Write `src/provision.test.ts` covering: `true` coerces to `{}`, `false` coerces to `{ disabled: true }`, missing coerces to `undefined`, valid object passes through, invalid object throws Zod error
- [ ] Add a negative test in `src/provision.test.ts` asserting `provision: "yes"` throws a Zod validation error

# Stage: Platform refs

- [ ] Write `src/platformRefs.ts` exporting `PLATFORM_REF_PATTERN: RegExp` that matches `{{platform.<vendor>.<path>}}` with capture groups for vendor and path
- [ ] Implement `isPlatformRef(value: string): boolean` returning true if the value contains at least one platform ref
- [ ] Implement `extractPlatformRefs(value: string): Array<{ vendor: string; path: string; full: string }>` returning every match in the input
- [ ] Write `src/platformRefs.test.ts` covering: single ref, multiple refs in one string, nested paths (`{{platform.homelab.network.subnet}}`), invalid syntax (no curly close) does not match
- [ ] Add a test asserting that `{{config.foo}}` and `{{vault.foo}}` are NOT matched by `PLATFORM_REF_PATTERN`

# Stage: Schema extensions

- [ ] Update `src/schema.ts` to add an optional `owner: z.string().optional()` field to `ProjectSchema`
- [ ] Update `src/schema.ts` to add an optional `infrastructure: z.record(z.unknown()).optional()` field to `BaseConfigSchema`
- [ ] Update `src/schema.ts` to add an optional `provision` field to the per-service schema using `ProvisionSchema` from `src/provision.ts`
- [ ] Write `src/schema.test.ts` cases verifying: `project.owner` present passes, `project.owner` absent passes (soft-required), `infrastructure: { homelab: {...} }` passes with arbitrary nested content, `provision: true` validates and coerces
- [ ] Add a Phase-7 regression test in `src/schema.test.ts` that loads `tests/fixtures/knowledge-base-phase7.yaml` (a copy of the existing grow-box fixture) and asserts it validates without errors

# Stage: Loader integration

- [ ] Update `src/loader.ts` to skip resolution of strings matched by `PLATFORM_REF_PATTERN`, preserving them verbatim in the resolved config
- [ ] Update `src/loader.ts` `LoadConfigResult` shape to include a `warnings: Array<{ path: string; message: string }>` field
- [ ] Emit a soft-required warning when `project.owner` is absent, populating `warnings` in the result
- [ ] Update `src/loader.ts` to apply `coerceProvision` to every service's `provision` field after schema validation
- [ ] Write `src/loader.test.ts` cases: platform refs preserved through `loadConfig`, missing `project.owner` produces exactly one warning, present `project.owner` produces zero warnings, `provision: true` resolves to `{}` in the result
- [ ] Add an end-to-end fixture test loading `tests/fixtures/schema-v2-full.yaml` with platform refs, infrastructure pot, provision objects, and ownership all present

# Stage: Exports and docs

- [ ] Update `src/index.ts` to re-export `ProvisionSchema`, `coerceProvision`, `PLATFORM_REF_PATTERN`, `isPlatformRef`, `extractPlatformRefs`, and the updated `LoadConfigResult` type
- [ ] Update `packages/shared/config/README.md` with a "Schema v2" section documenting the four new capabilities and a worked example
- [ ] Add a one-line pointer in the README to `packages/AGENTS.md` clarifying that `@open-tomato/config` is the SERVICE config, distinct from `@open-tomato/agents-config`

# Stage: Release

- [ ] Add a changeset describing the change: run `bunx changeset` and select `@open-tomato/config` with a `minor` bump (new features, no breaking change)
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
