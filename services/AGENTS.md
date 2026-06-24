# AGENTS — services/

This directory hosts the backend services: `notifications`, `orchestrator`, `scheduler`, `task-worker`. Each is a workspace member and consumes `@open-tomato/*` packages from the workspace via `workspace:^`.

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow), then the specific service's own `AGENTS.md`.

## Services

| Service | Role | AGENTS.md |
| --- | --- | --- |
| `notifications` | Notification dispatch with plugin architecture (anthropic, executor, tech-tree) | (no service-local file yet) |
| `orchestrator` | Loop orchestration, hook engine, RPC event bus, task store | [`orchestrator/AGENTS.md`](orchestrator/AGENTS.md) |
| `scheduler` | Job scheduling | (no service-local file yet) |
| `task-worker` | Worker process for executing tasks | [`task-worker/AGENTS.md`](task-worker/AGENTS.md) |

## Conventions

- Each service is its own publishable workspace member (private, not published).
- Express-based services use the `@open-tomato/express` library.
- MCP-based services use the `@open-tomato/mcp` library.
- Production code (`src/**/*.ts` except `*.test.ts`) is strict-checked. Test files are excluded from `check-types` per the established pattern (see root AGENTS.md "Known gotchas").

## Known pre-existing test debt

- **`orchestrator/src/loop/runner.test.ts` and store/*.test.ts:** several tests fail because `vi.mock('../store/tasks.js', ...)` does not export `countJobTasks`, `findNextPendingTask`, `updateTaskStatus` (broken since commit `e96fbb2` — the executor→orchestrator rename). NOT a structural-reorg regression. Fix when work touches the orchestrator runner; out of scope for the consolidation.

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../plans/INDEX.md`](../plans/INDEX.md) — initiative registry
- [`../packages/service/express/`](../packages/service/express/), [`../packages/service/mcp/`](../packages/service/mcp/) — service-tier libraries this area consumes
