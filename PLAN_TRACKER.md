# Plan: vault BWS strategies and id mapping

## Description

`@open-tomato/vault` is a small shared package that resolves `{{vault.<id>}}` references against Bitwarden Secrets Manager (BWS). It owns three concerns: (1) authentication strategy — environment variable, file, or interactive prompt; (2) vault-id mapping — the `<id>-<env>[-<region>]` fallback rule that lets a single config refer to an abstract id (`db-password`) and have it resolve to a concrete project secret (`db-password-staging-us-east-1`); (3) batch secret loading — `loadSecrets(refs, env)` that takes a set of `{{vault.*}}` refs and an environment and returns a resolved `Record<string, string>`.

This package is consumed by `@open-tomato/config` (during `loadConfig` when references are encountered) and by command modules that need to inject secrets at runtime. It does NOT call `bws` as a subprocess by default — it uses the `@bitwarden/sdk-napi` if available, falling back to subprocess only when the native binding is absent. `BWS_ACCESS_TOKEN` must be present in the environment at the time `loadSecrets` is called; missing tokens throw a typed `VaultAuthError` with a clear remediation message.

The id-mapping fallback rule (from REVIEW.md Section A): given a ref `{{vault.db-password}}` with env=`staging` and region=`us-east-1`, the resolver tries `db-password-staging-us-east-1` first, then `db-password-staging`, then `db-password`, returning the first one that exists. This is the rule that lets grow-box and Heroku share a config shape without duplicating per-env vault id fields.

Files created: `packages/shared/vault/package.json`, `tsconfig.json`, `eslint.config.mjs`, `README.md`, `src/auth.ts`, `src/mapping.ts`, `src/client.ts`, `src/loadSecrets.ts`, `src/errors.ts`, `src/index.ts`, plus `*.test.ts` siblings.

# Stage: Package scaffold

- [x] Create `packages/shared/vault/package.json` with name `@open-tomato/vault`, version `0.1.0`, `private: false`, `publishConfig.access: public`, `type: module`, `main: ./src/index.ts`, dependency on `@bitwarden/sdk-napi` (latest), devDependencies on `@open-tomato/eslint-config` and `@open-tomato/typescript-config` (both `workspace:^`), `eslint`, `typescript`, `vitest`, `@types/node`
- [x] Create `packages/shared/vault/tsconfig.json` extending `@open-tomato/typescript-config/base.json` with `include: ["src/**/*"]`
- [x] Create `packages/shared/vault/eslint.config.mjs` re-exporting `@open-tomato/eslint-config`
- [x] Create `packages/shared/vault/README.md` documenting auth strategies, the id-mapping fallback rule, and a `loadSecrets` example
- [x] Run `bun install` at the repo root to register the new workspace member
- [x] Create `packages/shared/vault/vitest.config.ts` with default config

# Stage: Errors

- [x] Write `src/errors.ts` exporting a `VaultError` base class extending `Error` with a `code` field
- [x] Add `VaultAuthError` subclass for missing or invalid `BWS_ACCESS_TOKEN`, with a remediation message in the constructor
- [x] Add `VaultRefNotFoundError` subclass with fields `ref` (the original `{{vault.foo}}` string) and `triedKeys` (string array of fallback attempts)
- [ ] Add `VaultIOError` subclass for network or SDK errors, wrapping the underlying cause
- [ ] Write `src/errors.test.ts` verifying that each error sets `name`, `code`, and `message` correctly and that `instanceof VaultError` is true for each subclass

# Stage: Auth strategies

- [ ] Write `src/auth.ts` exporting `AuthStrategy` type union `'env' | 'file' | 'interactive'` and `resolveAuth(strategy, options): Promise<{ token: string }>`
- [ ] Implement the `env` strategy reading `BWS_ACCESS_TOKEN`, throwing `VaultAuthError` if absent
- [ ] Implement the `file` strategy reading a path (default `~/.bws/token`), throwing `VaultAuthError` if missing or unreadable
- [ ] Implement the `interactive` strategy that prompts on TTY using `node:readline` (no `inquirer` dependency — keep the package small), throwing `VaultAuthError` in non-TTY contexts
- [ ] Write `src/auth.test.ts` covering all three strategies with mocked env/fs/tty; assert that missing token in `env` strategy throws `VaultAuthError`

# Stage: ID mapping

- [ ] Write `src/mapping.ts` exporting `resolveVaultId(id: string, env: string, region?: string): string[]` that returns the ordered fallback list
- [ ] Implement the fallback order: `<id>-<env>-<region>` (if region), `<id>-<env>`, `<id>`
- [ ] Write `src/mapping.test.ts` covering: id with env and region, id with env only, id with region only (no region segment in the list), bare id (single-element list)
- [ ] Add a test asserting the fallback list contains no duplicates when env and region are empty strings

# Stage: BWS client

- [ ] Write `src/client.ts` exporting `createClient(token: string): VaultClient` with method `getSecret(key: string): Promise<string | null>` (null on not-found, throws `VaultIOError` on network errors)
- [ ] Implement the primary path using `@bitwarden/sdk-napi` (lazy-import inside `createClient`)
- [ ] Implement the subprocess fallback that shells out to `bws secret get` when the native binding fails to load, parsing the JSON output
- [ ] Write `src/client.test.ts` with mocked SDK responses for: successful fetch, not-found (null), network error (throws), token rejection (throws `VaultAuthError`)

# Stage: loadSecrets

- [ ] Write `src/loadSecrets.ts` exporting `loadSecrets(refs: string[], opts: { env: string; region?: string; auth?: AuthStrategy; }): Promise<Record<string, string>>`
- [ ] Parse `{{vault.<id>}}` syntax from each ref, extracting the bare id
- [ ] For each id, walk `resolveVaultId` fallbacks against the client; record the first non-null hit, throw `VaultRefNotFoundError` if none match
- [ ] Return the resolved map keyed by the original ref string (e.g. `'{{vault.db-password}}'`), value being the secret
- [ ] Write `src/loadSecrets.test.ts` covering: single ref resolves on first fallback, single ref resolves on third fallback, missing ref throws `VaultRefNotFoundError` with `triedKeys` populated, batch of three refs all resolve
- [ ] Add a test that `loadSecrets` does not call the client more than necessary (caches resolved keys when multiple refs share an id)
- [ ] Write `src/index.ts` re-exporting `loadSecrets`, `resolveVaultId`, error classes, and the `AuthStrategy` type

# Stage: Release

- [ ] Add a changeset describing the change: run `bunx changeset` and select `@open-tomato/vault` with a `minor` bump (new package, ships at `0.1.0`)
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
