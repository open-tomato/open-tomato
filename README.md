# Open Tomato

Primary application monorepo — four backend services (`notifications`, `orchestrator`, `scheduler`, `task-worker`) plus the `app/` frontend, orchestrated with Bun and Turborepo.

Shared libraries, the CLI, and service templates live in sibling repos under the umbrella directory. This repo depends on them via `file:` references during the split; once packages are published to the npm org, those references switch to semver ranges.

## Name conventions

- **"Monorepo"** — this repository (`open-tomato/`).
- **"Project"** — an individual service or app within this monorepo.
- **"App"** — the frontend (Vite + React + TypeScript), under `app/`.
- **"Services"** — backend projects (typically Express-based), under `services/`.
- **"Types"** — repo-level shared TypeScript types, under `types/`.
- **"Packages"** — shared libraries consumed as deps; they live in the sibling [`../packages/`](../packages/) repo.

## Repository Structure

```text
open-tomato/
├── .github/                 # GitHub Actions workflow files
├── app/                     # Vite + React + TS frontend (placeholder scaffold)
├── docs/                    # Repo-level documentation (seeded in Plan 07)
├── services/                # Backend services (populated in Plan 03)
├── types/                   # Repo-level shared TypeScript types
├── AGENTS.md                # Agent guidelines
├── CONTRIBUTING.md          # Human contributor guide
├── README.md                # This file
├── SECURITY.md              # Security rules and reporting process
├── docker-compose.yml       # Dev-loop constellation (services + app + postgres)
├── eslint.config.ts         # Root ESLint configuration
├── package.json             # Root scripts + bun workspace declaration
├── tsconfig.json            # Root TypeScript configuration
└── turbo.json               # Turborepo pipeline configuration
```

## Core Tech Stack

| Layer                     | Tools                                                  |
| ------------------------- | ------------------------------------------------------ |
| Runtime & package manager | Bun (v1.3.9+), Node v22+                               |
| Language                  | TypeScript 5.0+ (`strict: true`)                       |
| Testing                   | Vitest + Supertest                                     |
| Linting                   | ESLint (no Prettier — style enforced via ESLint rules) |
| Validation                | Zod (schemas, OpenAPI generation, type inference)      |
| Documentation             | TSDoc / TypeDoc, OpenAPI                               |
| Secrets                   | Bitwarden Secrets Manager (`bws`)                      |
| CI/CD                     | GitHub Actions                                         |

## Quick start

```bash
bun install           # resolves file: references to ../packages/shared/*
bun run build         # turbo: build every workspace
bun run test          # turbo: run every workspace test
bun lint              # turbo: lint every workspace
bun run dev:stack     # docker compose up --build (full dev constellation)
```

Individual workspace scripts are runnable via turbo filters:

```bash
bun run dev --filter @open-tomato/app        # only the frontend
bun run test --filter @open-tomato/notifications
```

## Related repositories

| Path | Purpose |
| --- | --- |
| [`../packages/`](../packages/) | Shared libraries (`@open-tomato/logger`, `@open-tomato/errors`, …) |
| [`../tomato-cli/`](../tomato-cli/) | Standalone `tomato` CLI — repo helpers |
| [`../template-service-express/`](../template-service-express/) | Boilerplate for new Express services |
| [`../template-service-mcp/`](../template-service-mcp/) | Boilerplate for new MCP services |
| [`../skills/`](../skills/) | Claude agent skills (API, drizzle-orm, styling, …) |

## External services

Migrated in Plan 08, these live as **standalone sibling folders** under
the umbrella rather than inside this monorepo. They are intentionally
decoupled from the turbo pipeline.

| Path | Purpose | Port |
|------|---------|------|
| [`../auth/`](../auth/) | `@open-tomato/auth-service` — OAuth (GitHub/Google), session introspection | 3004 |
| [`../knowledge-base/`](../knowledge-base/) | `@open-tomato/knowledge-base` — knowledge artifact store (scaffold) | 3005 |
| [`../token-monitor/`](../token-monitor/) | `claude-dashboard-backend` — Claude Code activity dashboard (deprecated; JS-only) | 4242 |

To join any of these to the dev-loop constellation, uncomment the
matching `docker-compose.yml` stanza — each uses `context: ../<name>` so
Docker builds from the sibling folder.

## Further reading

- [AGENTS.md](AGENTS.md) — role definition, profiles, and workflow checklists for agentic development.
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, code style, testing, and PR workflow.
- [SECURITY.md](SECURITY.md) — security rules, secrets, and vulnerability reporting.
- [plans/refactor/](plans/refactor/) — execution plans for the ongoing legacy split.
