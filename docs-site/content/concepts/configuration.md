---
title: "Configuration"
category: concepts
slug: configuration
order: 3
lead: "How the CLI and services read their settings."
source: null
editHref: null
---

## The config file

`tomato init` creates `open-tomato.config.json`. It declares the models
available to a run, default budgets, and which providers are enabled.

```json
{
  "defaultModel": "sonnet",
  "budget": "50k",
  "providers": ["anthropic"]
}
```

## Environment overrides

Every service reads inline `process.env` at startup — there is no central
config service in the PoC. Secrets (API keys, database URLs) are supplied via
the environment, never committed. Services validate required variables on boot
and fail fast when one is missing.

## Related

- [Introduction](/concepts/introduction) — the overall stack.
- [Notifications](/api/notifications) — the event fan-out service.

