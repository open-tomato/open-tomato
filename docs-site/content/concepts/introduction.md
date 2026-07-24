---
title: "Introduction"
category: concepts
slug: introduction
order: 1
lead: "The consolidated active stack for Open Tomato — backend services, frontend app, the `tomato` CLI, the `@open-tomato/*` package ecosystem, service templates, and the agent context layer (`skills/`, `docs/`, `plans/`). One Bun + Turborepo workspace."
source: README.md
editHref: https://github.com/open-tomato/open-tomato/blob/main/README.md
---

## Name conventions

- **Mono-repo** — this repository (`open-tomato/`).
- **Workspace member** — any package or service tracked by the root `package.json`'s `workspaces` field.
- **Active stack** — what lives in this repo. Distinct from "satellites" (`grow-box/`, `auth/`, `knowledge-base/`, `token-monitor/`, `design-system/`, `component-breakdown/`) which stay as separate sibling repos under the umbrella.

## Repository structure

```text
open-tomato/
├── packages/                 # @open-tomato/* shared packages + publish pipeline
│   ├── shared/*              # framework-agnostic libs (logger, errors, config, …)
│   ├── service/*             # service-tier libs (express, mcp, service-core, …)
│   ├── notifications/*       # notification plugins
│   ├── agents/*              # agent infrastructure (agents-config)
│   ├── ui-skeleton/          # UI component library (on-hold)
│   └── scripts/              # publish pipeline (preflight, prepare-publish, …)
├── services/                 # backend services (notifications, orchestrator, scheduler, task-worker)
├── app/                      # Vite + React + TS frontend
├── cli/                      # tomato CLI (publishes as @open-tomato/cli)
├── templates/                # service templates (express, mcp)
├── types/                    # repo-level shared TS types (@open-tomato/repo-types)
├── docs/                     # publishable docs site source
├── skills/                   # agent skills (API, drizzle-orm, n8n-nodes, …)
├── plans/                    # initiative registry (start at plans/INDEX.md)
├── AGENTS.md                 # umbrella orientation for agents
├── CONTRIBUTING.md           # human contributor guide
├── README.md                 # this file
├── SECURITY.md               # security rules and reporting
├── docker-compose.yml        # dev-loop constellation
├── eslint.config.ts          # root ESLint config
├── package.json              # workspaces declaration + root scripts
├── tsconfig.json             # root TS config
├── turbo.json                # turbo pipeline
└── .changeset/               # changeset state for publish pipeline
```

## Core tech stack

| Layer                     | Tools                                                  |
| ------------------------- | ------------------------------------------------------ |
| Runtime & package manager | Bun (v1.3.9+), Node v22+                               |
| Build orchestration       | Turborepo                                              |
| Language                  | TypeScript 5.0+ (`strict: true`)                       |
| Testing                   | Vitest + Supertest                                     |
| Linting                   | ESLint                                                 |
| Validation                | Zod                                                    |
| Documentation             | TSDoc / TypeDoc, OpenAPI                               |
| Secrets                   | Bitwarden Secrets Manager (`bws`)                      |
| CI/CD                     | GitHub Actions                                         |
| Publish                   | Changesets → private registry (`npm.heimdall.bifemecanico.com`) |

## Quick start

```bash
bun install                          # resolves workspace:^ refs across all workspace members
bun run build                        # turbo: build every workspace
bun run test                         # turbo: run every workspace test
bun lint                             # turbo: lint every workspace
bun run check-types                  # turbo: tsc --noEmit across workspaces
bun run dev:stack                    # docker compose up --build (full dev constellation)
```

Per-workspace filters:

```bash
bun run dev --filter @open-tomato/app
bun run test --filter @open-tomato/notifications
bun run build --filter '@open-tomato/cli'
```

Publish pipeline (from `packages/`):

```bash
cd packages
bun run changeset:add                # author a changeset
bun run preflight                    # must pass
bun run publish:dry                  # full dry-run
bun run publish:local                # actually publish (needs registry creds)
```

## Sibling repos (satellites under the umbrella)

These stay outside this mono-repo and consume `@open-tomato/*` from the private registry as `^<version>`:

| Path | Purpose | Status |
| --- | --- | --- |
| [`../grow-box/`](../grow-box/) | Local dev environment simulating cloud infra (Auth, monitoring, package registry, vault, …). Downstream consumer of this stack. | active |
| [`../auth/`](../auth/) | `@open-tomato/auth-service` — OAuth + session introspection | on hold (sidecar architecture under consideration) |
| [`../knowledge-base/`](../knowledge-base/) | Knowledge artifact store | on hold |
| [`../token-monitor/`](../token-monitor/) | Claude Code activity dashboard | on hold |
| [`../design-system/`](../design-system/) | Full app design output from Claude Design | on hold (resumes after visual-testing pipeline) |
| [`../component-breakdown/`](../component-breakdown/) | Componentization of design-system | on hold |
| [`../workflows/`](../workflows/) | n8n workflow templates | satellite |

To join any of the on-hold services to the dev-loop constellation, uncomment its `docker-compose.yml` stanza.

## Further reading

- [`AGENTS.md`](AGENTS.md) — agent orientation
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup + code style + PR workflow
- [`SECURITY.md`](SECURITY.md) — security rules + vulnerability reporting
- [`plans/INDEX.md`](plans/INDEX.md) — initiative registry (authoritative roadmap)
- [`../MIGRATION_STATUS.md`](../MIGRATION_STATUS.md) — ground-truth tree snapshot
- [`packages/RELEASING.md`](packages/RELEASING.md), [`packages/VERSIONING.md`](packages/VERSIONING.md) — publish contract
