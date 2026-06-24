# AGENTS — templates/

Service boilerplates for spinning up new Express or MCP services with the Open Tomato conventions pre-wired. Workspace members and clone targets.

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow), then the specific template's own `AGENTS.md`.

## Templates

| Template | Built on | AGENTS.md |
| --- | --- | --- |
| `express/` | `@open-tomato/express` + `@open-tomato/service-core` | [`express/AGENTS.md`](express/AGENTS.md) |
| `mcp/` | `@open-tomato/mcp` + `@open-tomato/service-core` | [`mcp/AGENTS.md`](mcp/AGENTS.md) |

## Dual purpose

Templates serve two roles:

1. **Reference implementations** — they consume the latest `@open-tomato/*` packages via `workspace:^`, so they always demonstrate the current idioms and surface regressions early.
2. **Scaffolding sources** — copy a template's directory tree as the seed for a new service, then update the package name and remove placeholder code.

When the templates are used as a scaffold (not in-tree), the new service should consume `@open-tomato/*` from the **private registry** as `^<version>`, not as `workspace:^` (it's no longer inside this workspace).

## Pre-existing AGENTS.md content

The `express/AGENTS.md` and `mcp/AGENTS.md` files were preserved from the standalone `template-service-*` repos when they were subtree-merged. They may still describe their pre-consolidation standalone context. Refresh as work touches each template.

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../packages/service/express/`](../packages/service/express/), [`../packages/service/mcp/`](../packages/service/mcp/) — the libraries these templates wrap
- [`../plans/INDEX.md`](../plans/INDEX.md) — initiative registry
