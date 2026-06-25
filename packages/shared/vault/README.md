# @open-tomato/vault

Resolves `{{vault.<id>}}` references against Bitwarden Secrets Manager (BWS).
It owns three concerns shared by every consumer that needs secrets at runtime:
authentication strategy, vault-id mapping (`<id>-<env>[-<region>]` fallback),
and batch secret loading.

This package is the runtime resolver half of the secrets standard. It is
consumed by `@open-tomato/config` when a loaded config contains `{{vault.*}}`
references and by command modules that inject secrets directly (e.g.
`tomato config export`, `tomato run`). It deliberately does **not** read or
write `.env` files — that is the CLI's job.

By default the package talks to BWS through the `@bitwarden/sdk-napi` native
binding. If the binding fails to load (unsupported platform, missing prebuild),
it falls back to shelling out to the `bws` CLI. Both paths require
`BWS_ACCESS_TOKEN` to be resolvable through the chosen auth strategy.

## Installation

This is a workspace package:

```json
{
  "dependencies": {
    "@open-tomato/vault": "workspace:^"
  }
}
```

## Public exports

| Export | Kind | Purpose |
|---|---|---|
| `loadSecrets` | fn | Resolve a batch of `{{vault.*}}` refs against BWS for a given env/region. |
| `resolveVaultId` | fn | Returns the ordered fallback list for a bare vault id. |
| `AuthStrategy` | type | `'env' \| 'file' \| 'interactive'`. |
| `VaultError` | class | Base error class; all failures extend it. |
| `VaultAuthError` | class | Missing or invalid `BWS_ACCESS_TOKEN`. |
| `VaultRefNotFoundError` | class | No fallback key matched for a ref. Carries `ref` and `triedKeys`. |
| `VaultIOError` | class | Underlying SDK / network failure. Wraps the original `cause`. |

## Auth strategies

`loadSecrets` accepts an `auth` option that selects how the BWS access token is
obtained. All three strategies throw `VaultAuthError` with a remediation
message when the token cannot be resolved.

### `env` (default)

Reads `BWS_ACCESS_TOKEN` from `process.env`. This is the strategy used by CI,
production services, and any non-interactive context.

```ts
await loadSecrets(refs, { env: 'staging', auth: 'env' });
```

Missing token → `VaultAuthError` instructing the operator to export
`BWS_ACCESS_TOKEN` or pick a different strategy.

### `file`

Reads the token from a file on disk. Defaults to `~/.bws/token`. Use this when
the token is provisioned by a system-level secret store (e.g. macOS Keychain
helper, `pass`, `1password-cli`) that writes the token to a file but doesn't
inject it into the shell.

```ts
await loadSecrets(refs, {
  env: 'staging',
  auth: { strategy: 'file', path: '/etc/open-tomato/bws-token' },
});
```

Unreadable or missing file → `VaultAuthError`.

### `interactive`

Prompts on a TTY using `node:readline`. Reserved for ad-hoc developer commands
where no token is available in the environment. Throws `VaultAuthError` if
stdin is not a TTY (CI, piped invocations).

```ts
await loadSecrets(refs, { env: 'dev', auth: 'interactive' });
```

The package deliberately does not depend on `inquirer` or `prompts` — keeping
the install footprint minimal matters more than the prettier prompt.

## ID-mapping fallback rule

The fallback rule lets a single config refer to an abstract id (`db-password`)
and have it resolve to the concrete project secret for the current env/region
(`db-password-staging-us-east-1`). Given a ref `{{vault.<id>}}` with `env` and
optional `region`, the resolver tries keys in this order and returns the first
non-null hit:

```text
<id>-<env>-<region>   (only attempted if region is set)
<id>-<env>
<id>
```

`resolveVaultId('db-password', 'staging', 'us-east-1')` returns:

```ts
['db-password-staging-us-east-1', 'db-password-staging', 'db-password']
```

`resolveVaultId('db-password', 'staging')` returns:

```ts
['db-password-staging', 'db-password']
```

This is the rule that lets grow-box and Heroku share a config shape without
duplicating per-env or per-region vault id fields. Consumers can also opt out
of the fallback by spelling out the full key in the config
(`{{vault.db-password-staging-us-east-1}}`); the resolver still tries the
literal key first.

If no fallback key matches, `loadSecrets` throws `VaultRefNotFoundError` with
the original `ref` and the `triedKeys` array — so error messages can show the
operator exactly which keys were attempted.

## `loadSecrets` example

```ts
import { loadSecrets, VaultRefNotFoundError } from '@open-tomato/vault';

const refs = [
  '{{vault.db-password}}',
  '{{vault.stripe-api-key}}',
  '{{vault.sentry-dsn}}',
];

try {
  const secrets = await loadSecrets(refs, {
    env: 'staging',
    region: 'us-east-1',
    auth: 'env',
  });

  // The returned map is keyed by the original ref string:
  secrets['{{vault.db-password}}'];     // → 'pg://…' (matched db-password-staging-us-east-1)
  secrets['{{vault.stripe-api-key}}'];  // → 'sk_live_…' (matched stripe-api-key-staging)
  secrets['{{vault.sentry-dsn}}'];      // → 'https://…' (matched bare sentry-dsn)
} catch (err) {
  if (err instanceof VaultRefNotFoundError) {
    console.error(`No vault key found for ${err.ref}; tried: ${err.triedKeys.join(', ')}`);
  }
  throw err;
}
```

`loadSecrets` deduplicates client calls when several refs share an id, and
short-circuits on the first matching fallback key — so the worst case for N
refs is `N × fallback-depth` BWS lookups, and the typical case is much less.

## Errors

All failures are subclasses of `VaultError` and carry a stable `code`:

| Class | `code` | When |
|---|---|---|
| `VaultAuthError` | `AUTH_FAILED` | Missing/unreadable token, non-TTY interactive, BWS rejected token. |
| `VaultRefNotFoundError` | `REF_NOT_FOUND` | No fallback key matched for a ref. |
| `VaultIOError` | `IO_FAILED` | SDK or subprocess error. `cause` carries the underlying exception. |

Consumers should match on the `code` field rather than `instanceof` when
crossing package boundaries (the class identity is preserved within the
workspace but `code` is the stable wire contract).
