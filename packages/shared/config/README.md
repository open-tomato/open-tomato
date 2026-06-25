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

> **Not the agent config.** `@open-tomato/config` is the **service** config standard; agent configuration lives in `@open-tomato/agents-config` (`packages/agents/config`). See [`packages/AGENTS.md`](../../AGENTS.md) for the distinction.

## API

```ts
import { loadConfig, defineConfig, ConfigError } from '@open-tomato/config';

const { config, warnings } = await loadConfig({
  configDir: './config',      // dir containing config.default.yaml etc.
  env: process.env.NODE_ENV,  // 'dev' | 'staging' | 'prod'
  region: process.env.REGION, // optional — omit for single-region services
});

config.project.id;           // string
config.project.port;         // number
config.env.database_a.url;   // resolved — no templates

for (const w of warnings) {  // non-fatal advisories (e.g. missing project.owner)
  console.warn(`[config] ${w.path}: ${w.message}`);
}
```

`config` is readonly and deep-frozen. `warnings` is a `ConfigWarning[]`; an empty
array means the loader had nothing to flag.

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

## Schema v2

Phase 8 added four capabilities for platform plugins. The additions are
**purely additive** — Phase 7 fixtures (e.g. the grow-box knowledge-base
config) continue to validate unchanged.

### 1. `{{platform.<vendor>.*}}` references

Strings of the form `{{platform.<vendor>.<dotted.path>}}` are recognized by
the loader but **deliberately left unresolved**. They round-trip verbatim
through `{{config.*}}` resolution and validation, so a platform plugin's
`resolvePlatformRefs` can substitute them at emit-time.

The vendor segment must be kebab-case (`[a-z][a-z0-9-]*`); the path is a
dotted identifier (`[a-z0-9_][\w.-]*`). Other prefixes (`{{config.*}}`,
`{{vault.*}}`, `{{proc.*}}`) are not matched and keep their existing
semantics.

```ts
import { PLATFORM_REF_PATTERN, isPlatformRef, extractPlatformRefs } from '@open-tomato/config';

isPlatformRef('{{platform.homelab.network.subnet}}'); // true
extractPlatformRefs('cidr-{{platform.homelab.network.vlan}}-prod');
// → [{ vendor: 'homelab', path: 'network.vlan', full: '{{platform.homelab.network.vlan}}' }]
```

`PLATFORM_REF_PATTERN` carries the `g` flag — use `matchAll` (or clone it)
to avoid `lastIndex` state hazards.

### 2. `infrastructure.<vendor>` pot

`infrastructure` is now an open record keyed by vendor name. Each vendor
plugin owns its island and tightens the shape via `defineConfig`:

```ts
const HomelabInfra = defineConfig({
  infrastructure: z.object({
    homelab: z.object({
      host: z.string(),
      network: z.object({ subnet: z.string(), vlan: z.number() }),
    }),
  }),
});
```

Unknown vendor keys remain valid at the base layer, so multiple plugins
(`homelab`, `heroku`, …) can coexist in one file.

### 3. `provision` shorthand coercion

A service may declare `provision` as a boolean shorthand or a full object.
The loader normalizes all three forms into a single object shape after
schema validation, so downstream platform plugins only see one shape:

| YAML                          | Resolved value           |
| ----------------------------- | ------------------------ |
| `provision: true`             | `{}`                     |
| `provision: false`            | `{ disabled: true }`     |
| `provision: { caps: [...] }`  | passed through as-is     |
| _(absent)_                    | field omitted (`undefined`) |

The object form accepts `disabled?: boolean`, `caps?: string[]`, and
`metadata?: Record<string, unknown>`. Anything else (e.g. `provision: "yes"`)
throws `VALIDATION_FAILED`. Use `coerceProvision` directly if you need to
normalize a stand-alone value:

```ts
import { coerceProvision } from '@open-tomato/config';

coerceProvision(true);                  // {}
coerceProvision(false);                 // { disabled: true }
coerceProvision({ caps: ['db:write'] });// { caps: ['db:write'] }
coerceProvision(undefined);             // undefined
```

### 4. `project.owner` soft-required field

`project.owner` is an optional string field. When omitted, the loader
emits a single advisory in `LoadConfigResult.warnings` instead of failing
validation — the service still loads, but the platform knows who to
contact about it. Treat warnings as you would lint output: surface them
in logs, fail CI if you want stricter ownership coverage.

### Worked example

A single config file exercising all four additions:

```yaml
project:
  id: knowledge-base
  type: service
  name: Knowledge Base
  owner: platform-team            # soft-required → no warning emitted
  port: 3001

infrastructure:                   # vendor-keyed pot
  homelab:
    host: tomato-pi.local
    network:
      subnet: '10.0.0.0/24'
      vlan: 42
  heroku:
    region: us
    dyno: standard-1x

provision:                        # full object form
  caps: ['db:write', 'cache:read']
  metadata: { tier: gold }

env:
  server:
    port: '{{config.project.port}}'                       # self-ref → '3001'
  network:
    subnet: '{{platform.homelab.network.subnet}}'         # platform ref → preserved verbatim
    cidr: 'vlan-{{platform.homelab.network.vlan}}-prod'   # composed platform ref
    region: '{{platform.heroku.region}}'                  # second vendor preserved
    zones:
      - '{{platform.homelab.dns.zone}}'                   # platform ref inside an array
```

After `loadConfig`:

- `config.env.server.port` → `'3001'` (self-ref resolved)
- `config.env.network.subnet` → `'{{platform.homelab.network.subnet}}'` (preserved verbatim for the platform plugin)
- `config.provision` → `{ caps: ['db:write', 'cache:read'], metadata: { tier: 'gold' } }`
- `warnings` → `[]` (because `project.owner` is set)

Remove `owner: platform-team` and `warnings` becomes:

```ts
[{ path: 'project.owner', message: 'project.owner is recommended …' }]
```
