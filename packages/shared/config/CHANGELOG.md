# @open-tomato/config

## 0.2.0

### Minor Changes

- a7d61ce: Add schema v2 features: platform refs ({{platform.<vendor>.*}} pass-through), infrastructure.<vendor> pot, provision object coercion, and soft-required project.owner with warnings in LoadConfigResult.

  Part of Phase 8 registry cut — see plans/phase-8/.

### Patch Changes

- f80a59b: phase-8: append Phase 8 grouping note to cli-core, platform-core, vault, and config minor changesets
- 2e6d6d1: test(config): cover platformRefs helpers for single, multiple, nested, and malformed inputs
- 79489d3: add optional project.owner field to ProjectSchema
- 86c2156: Add optional provision field to BaseConfigSchema for service-level platform provisioning input
- ce72af1: Add isPlatformRef helper to @open-tomato/config
- 30f5e3c: Add README pointer to packages/AGENTS.md clarifying @open-tomato/config is the service config (distinct from @open-tomato/agents-config)
- 1ec62d9: loadConfig now emits a soft-required warning on result.warnings when project.owner is absent
- 77494ba: test(config): add Phase-7 grow-box fixture regression test for BaseConfigSchema
- b7bba1d: test(config): add end-to-end loader fixture exercising all schema-v2 features in one file
- f655b87: verify BaseConfigSchema already accepts optional infrastructure pot per Phase-8 schema v2 task
- a1414f6: add ProvisionSchema accepting true/false/object shorthands for service provisioning input
- ff0996c: test(config): verify coerceProvision rejects unsupported "yes" shorthand
- fc53665: loader: shield {{platform.*}} strings from {{config.*}} resolution so they survive verbatim
- 9ff324a: Re-export schema-v2 provision (ProvisionSchema, coerceProvision), platform-ref helpers (PLATFORM_REF_PATTERN, isPlatformRef, extractPlatformRefs), and the LoadConfigResult type from @open-tomato/config's package root.
- 1c24db3: tick checkbox — config minor changeset already pending (config-f0e6455d.md) for schema v2 additive features
- cc33c9c: loader: introduce LoadConfigResult envelope with warnings field
- f3c1ff7: Document schema v2 (platform refs, infrastructure pot, provision shorthand, project.owner) in the @open-tomato/config README
- b1c5125: add PLATFORM_REF_PATTERN regex for {{platform.<vendor>.<path>}} placeholders
- a4c521f: test(config): add schema.test.ts for owner, infrastructure pot, and provision shorthand
- 8258eaa: Add coerceProvision helper that normalizes true/false/object provision input into ProvisionObject | undefined
- 93e74cb: Add negative test for config/vault placeholders in PLATFORM_REF_PATTERN
- d07b54c: test(config): cover platform-ref preservation and provision:true coercion in loader.test.ts
- 497762b: config: loader coerces top-level provision shorthand to canonical object form
- 96d56d1: feat(config): add extractPlatformRefs helper for {{platform.*}} placeholders
- 71f36ae: test(config): cover coerceProvision boolean/object coercion and invalid-shape errors
