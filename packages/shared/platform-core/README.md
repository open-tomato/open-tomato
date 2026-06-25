# @open-tomato/platform-core

Pure TypeScript contract (`PlatformPlugin`) that every infrastructure vendor implements so `@open-tomato/config` can dispatch capability-matching, reference resolution, validation, and emission uniformly.

## Purpose

`platform-core` is the seam between Open Tomato's config layer and its infrastructure adapters. Concrete plugins — `@open-tomato/platform-growbox` (the Grow Box homelab), `@open-tomato/platform-heroku`, and future AWS/GCP packages — each implement a `PlatformPlugin` so that `loadConfig` and `bun svc generate` can talk to any vendor through one interface.

The package is **interface-only**: it ships the four-method contract, the supporting `ProvisionRequest` / `ProvisionAllowance` / `ResolvedConfig` / `MatchResult` / `ValidationResult` / `EmitTarget` / `EmitResult` types, and a no-op reference plugin used as a test fixture. It contains **no runtime behavior** beyond that fixture and a deterministic empty-config SHA-256 — vendor logic lives in the concrete plugin packages.

`platform-core` does **not** depend on `@open-tomato/cli-core` at runtime. The two packages are deliberately decoupled so plugins can be exercised from any host (CLI, TUI, server) and so `platform-core` can publish on its own cadence.

The pot-name convention `infrastructure.<vendor>` that selects which plugin handles a given service lives in `@open-tomato/config-schema-v2`; this package only defines the plugin shape.

## Installation

This is a workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@open-tomato/platform-core": "workspace:^"
  }
}
```

## Public exports

| Export | Kind | Purpose |
|---|---|---|
| `PlatformPlugin` | type | The contract — `name`, `version`, and four async methods. |
| `ProvisionRequest` | type | Capability ask from `@open-tomato/config`: `service`, `env`, `region`, `capabilities`, `metadata`. |
| `ProvisionAllowance` | type | Plugin's answer to a request: `allowed`, `reasons`, resolved `caps`. |
| `ResolvedConfig` | type | Post-resolution config payload passed into `resolvePlatformRefs` / `emit`. |
| `MatchResult` | type | Output of `matchCapabilities`: `matches`, `score` (0..1), `missing`. |
| `ValidationResult` | type | Output of `validateProvision`: `valid`, structured `errors`, `warnings`. |
| `EmitTarget` | type | A single file to write: `kind`, `path`, `content` (`string \| Uint8Array`), optional `mode`. |
| `EmitResult` | type | Output of `emit`: ordered `targets` plus a stable `lockHash`. |
| `createNoopPlugin` | fn | `(name: string) => PlatformPlugin` — safe-default reference fixture for tests. |

## The `PlatformPlugin` contract

```ts
interface PlatformPlugin {
  readonly name: string;
  readonly version: string;

  matchCapabilities(request: ProvisionRequest): Promise<MatchResult>;
  resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string>;
  validateProvision(request: ProvisionRequest, allowance: ProvisionAllowance): Promise<ValidationResult>;
  emit(config: ResolvedConfig): Promise<EmitResult>;
}
```

### Method semantics

| Method | Called during | Responsibility |
|---|---|---|
| `matchCapabilities` | `loadConfig` plugin dispatch | Inspect the requested capabilities and report whether this plugin can satisfy them. Score on `0..1`; list anything missing in `missing` so the host can surface a useful error. |
| `resolvePlatformRefs` | template expansion in `loadConfig` | Replace platform-specific refs (e.g. `${heroku.database.url}`) inside the supplied template against the resolved config. Return the substituted string. |
| `validateProvision` | `bun svc validate` and pre-emit | Cross-check the request against the allowance and the plugin's own invariants. Return structured `errors`/`warnings` — **do not throw** for user-facing problems. |
| `emit` | `bun svc generate` | Produce the files that materialize the provision (manifests, env files, lockfiles, etc.) and a deterministic `lockHash` for change detection. |

### Error semantics

- **Throw** on programmer errors (missing required hooks, malformed plugin metadata, contract violations the host should crash on).
- **Return** `ValidationResult` with `valid: false` for user-facing errors so the CLI can render them as structured diagnostics.
- `emit` may throw if the resolved config is internally inconsistent in a way `validateProvision` should have caught — treat that throw as a bug in the plugin, not user input.

### Determinism

Both `resolvePlatformRefs` and `emit` must be deterministic for a given input: the same `ResolvedConfig` must produce the same `targets` and the same `lockHash` byte-for-byte. The host uses `lockHash` to skip no-op writes and to detect drift.

## Example plugin skeleton

A minimal plugin that claims one capability (`db.postgres`) and emits a single env file:

```ts
import { createHash } from 'node:crypto';
import type {
  PlatformPlugin,
  ProvisionRequest,
  ProvisionAllowance,
  ResolvedConfig,
  MatchResult,
  ValidationResult,
  EmitResult,
} from '@open-tomato/platform-core';

export const examplePlugin: PlatformPlugin = {
  name: 'example',
  version: '0.1.0',

  async matchCapabilities(request: ProvisionRequest): Promise<MatchResult> {
    const supported = new Set(['db.postgres']);
    const missing = request.capabilities.filter((c) => !supported.has(c));
    return {
      matches: missing.length === 0,
      score: missing.length === 0 ? 1 : 0,
      missing,
    };
  },

  async resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string> {
    return template.replace(/\$\{example\.([^}]+)\}/g, (_, key: string) => {
      const value = ctx.infrastructure[key];
      return typeof value === 'string' ? value : '';
    });
  },

  async validateProvision(
    request: ProvisionRequest,
    allowance: ProvisionAllowance,
  ): Promise<ValidationResult> {
    if (!allowance.allowed) {
      return {
        valid: false,
        errors: [{ path: 'allowance', message: allowance.reasons.join('; ') }],
        warnings: [],
      };
    }
    if (!request.env) {
      return {
        valid: false,
        errors: [{ path: 'env', message: 'env is required' }],
        warnings: [],
      };
    }
    return { valid: true, errors: [], warnings: [] };
  },

  async emit(config: ResolvedConfig): Promise<EmitResult> {
    const body = `# generated by example plugin\nSERVICE=${config.service}\nENV=${config.env}\n`;
    const targets = [
      {
        kind: 'env-file',
        path: `.env.${config.env}`,
        content: body,
        mode: 0o600,
      },
    ];
    const lockHash = createHash('sha256').update(body).digest('hex');
    return { targets, lockHash };
  },
};
```

## Reference no-op plugin

`createNoopPlugin(name)` returns a `PlatformPlugin` whose methods resolve to safe, empty defaults. Use it as a test fixture wherever code needs *a* plugin but does not care which one:

```ts
import { createNoopPlugin } from '@open-tomato/platform-core';

const plugin = createNoopPlugin('test-fixture');

await plugin.matchCapabilities({ /* ... */ });
// → { matches: false, score: 0, missing: [] }

await plugin.emit({ /* ... */ });
// → { targets: [], lockHash: '<deterministic sha-256 of the empty payload>' }
```

The empty-`emit` `lockHash` is fixed, so consumer tests can assert against it directly without re-deriving the hash.

## Notes

- Pure TypeScript. No build step. The package exposes `src/index.ts` directly via workspace exports.
- No runtime dependencies. `@types/node` is dev-only.
- The four-method surface is intentionally small. Cross-cutting helpers (config loading, ref-expansion plumbing, emit-to-disk) live in `@open-tomato/config`, not here.
- Concrete plugin packages (`@open-tomato/platform-growbox`, `@open-tomato/platform-heroku`, …) version independently. Bumping `platform-core` is a contract change and forces a coordinated rev of every plugin.
