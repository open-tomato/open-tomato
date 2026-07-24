---
title: "Agents Config"
category: api
slug: agents-config
order: 2
lead: "YAML-based configuration loader for the Open Tomato orchestrator. Validates config at startup with Zod schemas, applies environment variable overrides, and resolves hat collections from files or built-in presets."
source: packages/agents/config/README.md
editHref: https://github.com/open-tomato/open-tomato/blob/main/packages/agents/config/README.md
---

## Quick Start

```typescript
import { loadConfig, ConfigValidationError } from '@open-tomato/agents-config';

try {
  const config = await loadConfig({
    configPath: './orchestrator.yml',
  });

  console.log('Backend:', config.cli.backend);
  console.log('Max iterations:', config.event_loop.iterations);
} catch (err) {
  if (err instanceof ConfigValidationError) {
    console.error(err.message); // Human-readable Zod issue lines
    process.exit(1);
  }
  throw err;
}
```

### With hat collections

```typescript
const config = await loadConfig({
  configPath: './orchestrator.yml',
  // Mix built-in presets with local files — merged left-to-right
  hatSources: ['builtin:wave-review', './custom-hats.yml'],
});

// config.hatCollection is now set
for (const hat of config.hatCollection?.hats ?? []) {
  console.log(hat.id, hat.triggers);
}
```

### With runtime env overrides

```typescript
const config = await loadConfig({
  configPath: './orchestrator.yml',
  // These take final precedence over process.env and the YAML file
  envOverride: { MAX_TURNS: '5', BACKEND: 'openai' },
});
```

## Minimal config file

All sections are optional — defaults are applied for any omitted field.

```yaml
# orchestrator.yml
event_loop:
  iterations: 20
  cost_limit_usd: 5.00

cli:
  backend: anthropic
  prompt_mode: oneshot
```

## Built-in presets

| Specifier | Description |
|---|---|
| `builtin:wave-review` | Scatter-gather code-review hat collection |
| `builtin:sequential` | Single-hat sequential workflow |

## Environment variable overrides

| Variable | Config field |
|---|---|
| `BACKEND` | `cli.backend` |
| `MAX_TURNS` | `event_loop.iterations` |
| `TIMEOUT_S` | `event_loop.runtime_ms` (converted to ms) |

## Error types

| Class | When thrown |
|---|---|
| `ConfigValidationError` | Schema validation fails; `.message` contains readable Zod issue lines |
| `ConfigSemanticError` | Passes schema but fails a semantic check (e.g. unresolvable bot token) |
| `YamlFileNotFoundError` | `configPath` does not exist on disk |
| `YamlParseError` | File exists but contains invalid YAML |
