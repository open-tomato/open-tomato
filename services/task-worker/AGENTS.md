---
title: "Task-Worker Service Agent Context"
description: "Service-specific gotchas and guidelines for the task-worker service."
---

# Task-Worker Service — Agent Context

## Gotchas

### Claude-Only Architecture

- **No multi-backend fallback**: The task-worker wraps Claude Code CLI exclusively. It does NOT support Gemini, Codex, or other CLI tools. Model flexibility comes from the `--model` flag, not different CLI backends.
- **Model preset validation**: Only models in the approved registry (`packages/worker-protocol/src/model-preset.ts`) can be used. Requests with unknown model names return 400. The registry is intentionally restrictive — models must support tool use and coding.
- **Custom providers via ANTHROPIC_BASE_URL**: For local models (Ollama, etc.), the task-worker sets `ANTHROPIC_BASE_URL` in the subprocess environment. The Claude CLI routes API calls to that endpoint. This means the local model must expose an Anthropic-compatible API.

### Dual Entry Point

- **HTTP mode** (`index.ts`): Express server on port 4310. Uses `createService` from `@open-tomato/express`. Registers SIGTERM handler for instinct flush.
- **CLI mode** (`cli.ts`): Subcommand-based (`exec`, `workspace-prepare`, `workspace-clean`, `instinct-flush`, `health`). Outputs NDJSON to stdout (same event shapes as SSE). Exit codes 0-127 are Claude CLI pass-through; 200+ are task-worker-specific (`CLI_EXIT_CODES` in `@open-tomato/worker-protocol`).
- **Shared core**: Both modes use the same `src/core/` modules (spawner, workspace-manager, instinct-lifecycle). Route handlers and CLI commands are thin wrappers.

### SSE/NDJSON Event Protocol

- **HTTP mode**: `POST /exec` returns `Content-Type: text/event-stream`. Events are `data: {...}\n\n` lines.
- **CLI mode**: `exec` subcommand writes one JSON object per line to stdout (NDJSON).
- **Event shapes**: `{"stream":"stdout","line":"..."}`, `{"stream":"stderr","line":"..."}`, `{"exit":<code>}`, `{"error":"..."}`. Defined in `@open-tomato/worker-protocol/src/sse-events.ts`.
- **The worker streams raw Claude CLI output**: It does NOT normalize, parse, or classify the output. The executor's SSE/NDJSON adapters handle that.

### Workspace Isolation

- **Each worker instance gets its own temp directory**: Created by `WorkspaceManager.prepare()` via `fs.mkdtempSync`. Shallow clone (`--depth 1`) to minimize disk usage.
- **Local mode isolation**: When the executor runs multiple local workers, each gets a separate temp dir. The executor's `TaskWorkerCliClient` manages this. Prevents branch conflicts and instinct contamination.
- **Cleanup is the executor's responsibility**: `cleanWorkspace()` on the executor side calls `workspace-clean` (CLI) or `DELETE /workspace` (HTTP). The task-worker does not auto-clean.

### Instinct Lifecycle

- **Bootstrap on startup** (HTTP mode only): Pulls blessed instinct bundle from orchestrator URL. Silent no-op if `ORCHESTRATOR_URL` is absent.
- **Flush on SIGTERM** (HTTP mode): Exports personal instincts before exit. The SIGTERM handler is registered before the Express server starts.
- **CLI mode**: No automatic bootstrap/flush. The executor calls `instinct-flush` subcommand explicitly during `cleanWorkspace()`.
- **Orchestrator dependency is optional**: All instinct operations are fire-and-forget. If the orchestrator is unreachable, the worker continues normally.

### Process Spawning

- **All subprocess calls use array-based `Bun.spawn`**: No shell interpolation. The `ProcessSpawner` interface is injectable for testing.
- **Prompt is delivered via stdin**: `new TextEncoder().encode(prompt)` is passed as `stdin` to `Bun.spawn`. This matches the Claude CLI's `-p` flag behavior.
- **`--dangerously-skip-permissions` is always set**: The task-worker runs headless — no interactive permission prompts.

### Security

- **No database**: The task-worker is stateless (no PostgreSQL, no Drizzle). State is in-memory (`WorkerStateManager`) and filesystem (`WorkspaceManager`).
- **One job at a time**: `POST /exec` returns 409 if the worker is already busy. The executor's pool manages concurrency across multiple worker instances.
- **ANTHROPIC_API_KEY must be set in the environment**: The task-worker does not manage API keys. For Docker mode, inject via container environment. For local mode, inherited from the executor's environment.
