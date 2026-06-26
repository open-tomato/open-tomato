# @open-tomato/vault

## 0.2.0

### Minor Changes

- c57c4d6: Add @open-tomato/vault: BWS-backed secret resolver with env/file/interactive auth strategies, id-mapping fallback (<id>-<env>-<region>), and batched loadSecrets() for {{vault.*}} refs.

  Part of Phase 8 registry cut — see plans/phase-8/.

### Patch Changes

- f80a59b: phase-8: append Phase 8 grouping note to cli-core, platform-core, vault, and config minor changesets
- 12d216e: feat(vault): implement file auth strategy reading token path (default ~/.bws/token)
- 31f7aee: test(vault): confirm resolveVaultId empty-string env/region dedup test in place
- d9fc0d7: add VaultError base class with code field to @open-tomato/vault
- 23fd49a: test(vault): assert loadSecrets idCache prevents duplicate client calls
- 6137b05: vault: add default vitest config
- bfb2d7f: mark vault loadSecrets fallback-walk task complete (impl already shipped in ff687f9)
- dcd5ad1: vault: scaffold createClient/VaultClient public contract
- 4a4e1a5: mark loadSecrets keyed-by-ref task complete (impl already shipped in ff687f9 — loadSecrets returns a Record keyed by the original {{vault.<id>}} ref string)
- b8cf0a8: vault: confirm {{vault.<id>}} ref parser implemented in loadSecrets
- 39fc77d: Add VaultIOError subclass for network/SDK errors wrapping the underlying cause
- 8bb7413: vault: implement BWS SDK primary transport in createClient via lazy @bitwarden/sdk-napi import
- 8df44f1: test(vault): cover resolveVaultId fallback combinations
- a84fe1f: vault: scaffold auth.ts with AuthStrategy type and resolveAuth dispatcher
- e35d639: vault: add VaultAuthError subclass with built-in remediation message for missing or invalid BWS_ACCESS_TOKEN
- 923cae7: scaffold @open-tomato/vault package.json (name, version 0.1.0, deps on @bitwarden/sdk-napi, standard dev deps)
- 7fbaa72: scaffold @open-tomato/vault tsconfig.json extending base config
- 1bb071a: Register @open-tomato/vault workspace in bun.lock
- 3396dc1: vault: expose public entry point re-exporting loadSecrets, resolveVaultId, error classes, and AuthStrategy
- 5164cbc: add loadSecrets batch resolver that walks id-mapping fallbacks against the BWS client
- 9de8d9d: implement env auth strategy reading BWS_ACCESS_TOKEN with VaultAuthError fallback
- efa208d: implement vault interactive auth strategy using node:readline (TTY-only)
- e75ac4a: vault: confirm resolveVaultId fallback order spec coverage
- f384208: test(vault): add loadSecrets resolver coverage
- 50f4174: docs(vault): add README documenting auth strategies, id-mapping fallback, and loadSecrets example
- ab6c5af: feat(vault): add resolveVaultId id-mapping fallback helper
- f1de69d: tick checkbox — vault minor changeset already pending (vault-71e01705.md) for 0.1.0 initial release
- 24969a1: Add client.test.ts covering SDK transport: successful fetch, not-found null, network error → VaultIOError, token rejection → VaultAuthError
- 19404a3: test(vault): cover auth env, file, and interactive strategies
- 7eda50d: vault: fall back to bws CLI subprocess transport when @bitwarden/sdk-napi binding fails to load
- 93fae9b: scaffold @open-tomato/vault eslint.config.mjs re-exporting base config
- 7ac893a: vault: add VaultRefNotFoundError with ref and triedKeys fields
- d90c411: test(vault): cover errors.ts with name/code/message and instanceof checks
