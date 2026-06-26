# @open-tomato/platform-core

## 0.2.0

### Minor Changes

- b5956c7: platform-core: ship initial 0.1.0 — PlatformPlugin contract, provision/match/validate/emit types, and createNoopPlugin reference implementation

  Part of Phase 8 registry cut — see plans/phase-8/.

### Patch Changes

- ecd6935: platform-core: add README documenting PlatformPlugin contract and example skeleton
- f80a59b: phase-8: append Phase 8 grouping note to cli-core, platform-core, vault, and config minor changesets
- 0a2ea3e: platform-core -- register workspace via bun install
- 19f826a: verify emit signature in PlatformPlugin
- bc5a3f3: platform-core -- add ProvisionAllowance interface
- 626866b: platform-core: add MatchResult interface
- c32c933: platform-core: add EmitTarget interface
- 9b2db88: verify resolvePlatformRefs signature in PlatformPlugin
- 4b107b2: Public entry point re-exports provisioning types, PlatformPlugin contract, and createNoopPlugin
- 05f1ae0: platform-core: add PlatformPlugin interface skeleton
- 01c6789: platform-core: noopPlugin now returns a deterministic SHA-256 lockHash for empty emit results
- ddfab3b: Add vitest config with node environment for test runner setup
- 61a5144: platform-core: add ResolvedConfig interface for post-platform-resolution config payload
- fb29554: platform-core: add type-level test asserting PlatformPlugin requires all members
- f1a1076: Add createNoopPlugin reference plugin to @open-tomato/platform-core
- 6e0b509: platform-core: add ProvisionRequest interface in src/types.ts
- f5f5e17: platform-core: add ValidationResult interface
- 94daec3: tick checkbox — platform-core minor changeset already pending (platform-core-da7c4939.md) for 0.1.0 initial release
- 029ffb8: Document PlatformPlugin method contracts with JSDoc (inputs, outputs, error semantics)
- bf736fc: test(platform-core): coverage for createNoopPlugin shape and empty-emit lockHash
- 2878a5b: platform-core: add tsconfig extending @open-tomato/typescript-config base preset
- 843b4ad: platform-core -- types.test type-level assertions
- 8bc23b6: platform-core -- eslint config scaffold
- e572041: platform-core: add EmitResult interface
- b4ff2c4: verify matchCapabilities(request: ProvisionRequest): Promise<MatchResult> signature in PlatformPlugin
- 32eb913: verify validateProvision signature in PlatformPlugin
- b6b15e2: scaffold @open-tomato/platform-core package.json
