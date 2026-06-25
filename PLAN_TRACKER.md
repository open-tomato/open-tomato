# Plan: platform-core interface

## Description

`@open-tomato/platform-core` defines the `PlatformPlugin` contract that every infrastructure vendor (Grow Box homelab, Heroku, future AWS/GCP) implements. It is an interface-only package: no runtime code beyond a no-op reference plugin used as a test fixture and a couple of small type guards. The four method surface — `matchCapabilities`, `resolvePlatformRefs`, `validateProvision`, `emit` — is the same shape `@open-tomato/config` calls into during `loadConfig` and `bun svc generate`.

This package sits between `@open-tomato/cli-core` (which it does not depend on at runtime — keep them decoupled) and `@open-tomato/config` (which consumes the interface for plugin dispatch). It must publish independently of any concrete plugin so `@open-tomato/platform-growbox` (grow-box) and `@open-tomato/platform-heroku` can ship on their own cadence. The pot-name convention `infrastructure.<vendor>` lives in `config-schema-v2`; this package only defines the plugin shape.

Files created: `packages/shared/platform-core/package.json`, `tsconfig.json`, `eslint.config.mjs`, `README.md`, `src/types.ts`, `src/plugin.ts`, `src/noopPlugin.ts`, `src/index.ts`, plus `*.test.ts` siblings.

# Stage: Package scaffold

- [x] Create `packages/shared/platform-core/package.json` with name `@open-tomato/platform-core`, version `0.1.0`, `private: false`, `publishConfig.access: public`, `type: module`, `main: ./src/index.ts`, `exports: { ".": "./src/index.ts" }`, devDependencies on `@open-tomato/eslint-config` and `@open-tomato/typescript-config` (both `workspace:^`), `eslint`, `typescript`, `vitest`, `@types/node`
- [x] Create `packages/shared/platform-core/tsconfig.json` extending `@open-tomato/typescript-config/base.json` with `include: ["src/**/*"]`
- [x] Create `packages/shared/platform-core/eslint.config.mjs` re-exporting `@open-tomato/eslint-config`
- [x] Create `packages/shared/platform-core/README.md` documenting the `PlatformPlugin` contract and giving an example plugin skeleton
- [x] Run `bun install` at the repo root to register the new workspace member
- [x] Create `packages/shared/platform-core/vitest.config.ts` with default config

# Stage: Provision types

- [x] Write `src/types.ts` exporting `ProvisionRequest` interface with fields `service`, `env`, `region`, `capabilities` (string array), `metadata` (record of string to unknown)
- [x] Add `ProvisionAllowance` interface to `src/types.ts` with fields `allowed` (boolean), `reasons` (string array), `caps` (record of string to string for resolved capability values)
- [x] Add `ResolvedConfig` interface to `src/types.ts` representing the post-platform-resolution config payload with fields `service`, `env`, `infrastructure` (record), `vault` (record), `extras` (record)
- [x] Add `MatchResult` interface to `src/types.ts` with fields `matches` (boolean), `score` (number 0..1), `missing` (string array)
- [ ] Add `ValidationResult` interface to `src/types.ts` with fields `valid` (boolean), `errors` (array of `{ path: string; message: string }`), `warnings` (same shape)
- [ ] Add `EmitTarget` interface to `src/types.ts` with fields `kind` (string), `path` (string), `content` (string or Buffer), `mode` (optional octal number)
- [ ] Add `EmitResult` interface to `src/types.ts` with fields `targets` (array of `EmitTarget`), `lockHash` (string SHA-256 hex)
- [ ] Write `src/types.test.ts` with type-level assertions that `ProvisionAllowance.reasons` is a readonly array and that `EmitTarget.content` is `string | Uint8Array`

# Stage: PlatformPlugin contract

- [ ] Write `src/plugin.ts` exporting `PlatformPlugin` interface with fields `name` (string), `version` (semver string), and four methods
- [ ] Define `matchCapabilities(request: ProvisionRequest): Promise<MatchResult>` method signature in `PlatformPlugin`
- [ ] Define `resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string>` method signature in `PlatformPlugin`
- [ ] Define `validateProvision(request: ProvisionRequest, allowance: ProvisionAllowance): Promise<ValidationResult>` method signature in `PlatformPlugin`
- [ ] Define `emit(config: ResolvedConfig): Promise<EmitResult>` method signature in `PlatformPlugin`
- [ ] Add JSDoc to every method in `PlatformPlugin` documenting expected inputs, outputs, and error semantics (throw on programmer error, return `ValidationResult` for user-facing errors)
- [ ] Write `src/plugin.test.ts` with a type-level test that a plain object satisfying the interface compiles, and that omitting any method produces a TypeScript error

# Stage: Reference no-op plugin

- [ ] Write `src/noopPlugin.ts` exporting `createNoopPlugin(name: string): PlatformPlugin` that returns a plugin whose methods resolve to empty/safe defaults (`matchCapabilities` returns `{ matches: false, score: 0, missing: [] }`, `emit` returns `{ targets: [], lockHash: '...' }`)
- [ ] Implement deterministic SHA-256 hash computation for the empty `emit` result so tests can assert against a known value
- [ ] Write `src/noopPlugin.test.ts` verifying every method returns the documented shape and that the plugin satisfies `PlatformPlugin` structurally
- [ ] Write `src/index.ts` re-exporting all types from `types.ts`, the `PlatformPlugin` interface from `plugin.ts`, and `createNoopPlugin` from `noopPlugin.ts`

# Stage: Release

- [ ] Add a changeset describing the change: run `bunx changeset` and select `@open-tomato/platform-core` with a `minor` bump (new package, ships at `0.1.0`)
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
