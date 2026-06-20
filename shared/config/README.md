# @open-tomato/config

The shared **service & package configuration standard**. It replaces the static
`.env` with a typed, layered YAML config that the CLI composes, the running
service loads, and the pipeline reads to provision and deploy.

This package is the **runtime loader** half of the standard: it discovers and
deep-merges the config stack for a given env/region, resolves `{{config.*}}`
self-references, validates the result against the four-section schema, and
returns a typed, deep-frozen object.

It deliberately does **not** resolve `{{vault.*}}`, `{{proc.*}}`, or
`{{platform.*}}`, and it does not write `.env` files — those are the CLI's job
(`tomato config export`), done before a service starts. By the time
`loadConfig()` runs, secrets and process values are already resolved into the
environment.

## API

```ts
import { loadConfig, defineConfig, ConfigError } from '@open-tomato/config';

const config = await loadConfig({
  configDir: './config',     // dir containing config.default.yaml etc.
  env: process.env.NODE_ENV,  // 'dev' | 'staging' | 'prod'
  region: process.env.REGION, // optional — omit for single-region services
});

config.project.id;           // string
config.project.port;         // number
config.env.database_a.url;   // resolved — no templates
```

The returned object is readonly and deep-frozen.

### Schema sections

Every config file uses the same sections (see the OPT-137 spec):

- `project` — identity, type, routing; validated against a type-specific schema.
- `infrastructure` — provisioning params consumed by the pipeline; extensible
  per vendor via `defineConfig` (e.g. the homelab `infrastructure.homelab`
  island).
- `env` — free-form runtime values; structure is fixed by `config.default.yaml`,
  overlays may change values but not add keys.

### Merge hierarchy

```text
config.default.yaml → config.<env>.yaml → config.<env>.<region>.yaml
```

`config.local.yaml` is loaded last **only** when `NODE_ENV=development`.

### `defineConfig`

```ts
const ServiceConfig = defineConfig({
  env: z.object({
    database_a: z.object({ url: z.string().url(), pool_size: z.number() }),
  }),
});

const config = await loadConfig({ configDir: './config', env, schema: ServiceConfig });
```

## Errors

All failures are `ConfigError` with a `code`:
`MISSING_DEFAULT | VALIDATION_FAILED | UNRESOLVED_TEMPLATE | SCHEMA_MISMATCH`.
