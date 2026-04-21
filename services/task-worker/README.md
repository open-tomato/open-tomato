# services/task-worker — Claude Code CLI Worker Service

Standalone HTTP service and CLI tool that wraps Claude Code CLI invocations. The executor dispatches work to task-worker instances, which spawn the CLI, stream output back, and manage workspace lifecycle.

## Architecture

```text
executor (services/executor)
  → POST /exec                     run one Claude CLI invocation
  ← SSE stream (stdout/stderr/exit events)
  → POST /workspace                prepare workspace (git clone)
  → DELETE /workspace              clean up workspace
  → GET /health                    check status + supported models
```

The task-worker is a **thin process spawner** — it does not manage fallback chains, error classification, or retry logic. Those are the executor's responsibility.

## Run Modes

The task-worker supports two entry points:

### HTTP Server (remote/docker mode)

```sh
bun run dev     # hot-reload dev server on port 4310
bun run start   # production
```

### CLI (local mode)

```sh
bun cli.ts exec --prompt "Fix the bug" --work-dir /tmp/workspace --model sonnet
bun cli.ts workspace-prepare --branch feature/x --dir /tmp/workspace
bun cli.ts workspace-clean --dir /tmp/workspace
bun cli.ts instinct-flush
bun cli.ts health
```

The executor's `TaskWorkerCliClient` spawns the CLI as a subprocess in local mode.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4310` | HTTP listen port |
| `WORKER_ID` | `task-worker-0` | Worker identifier (unique per instance) |
| `DEFAULT_MODEL` | `sonnet` | Model preset name from the approved registry |
| `ORCHESTRATOR_URL` | _(absent)_ | Hive learning orchestrator for instinct sync |
| `ANTHROPIC_API_KEY` | _(required)_ | API key for Anthropic models |

## Supported Models

Only models in the approved preset registry can be used:

| Preset | Model | Provider |
|--------|-------|----------|
| `opus` | `claude-opus-4-20250514` | Anthropic |
| `sonnet` | `claude-sonnet-4-20250514` | Anthropic |
| `haiku` | `claude-haiku-4-5-20251001` | Anthropic |
| `local-qwen-14b` | `qwen2.5-coder:14b` | Custom (Ollama) |

Custom providers set `ANTHROPIC_BASE_URL` in the Claude CLI's environment.

## API Reference

### `POST /exec`

Spawn a Claude CLI invocation and stream output.

**Request:**
```json
{
  "prompt": "Fix the auth bug",
  "workDir": "/workspace/repo",
  "model": "sonnet",
  "providerUrl": "http://localhost:11434/v1"
}
```

**Response:** SSE stream
```text
data: {"stream":"stdout","line":"Looking at the code..."}
data: {"stream":"stderr","line":"Warning: something"}
data: {"exit":0}
```

Returns `409` if the worker is busy.

### `POST /workspace`

Prepare a workspace by cloning a repo into a temp directory.

**Request:**
```json
{ "branch": "feature/OPT-123", "repoUrl": "https://github.com/org/repo" }
```

**Response:**
```json
{ "workDir": "/tmp/task-worker-abc123" }
```

### `DELETE /workspace`

Clean up the current workspace.

### `GET /health`

```json
{ "status": "idle", "workerId": "task-worker-0", "supportedModels": ["opus", "sonnet", "haiku"] }
```

## Docker

```sh
docker build -t task-worker -f Dockerfile ../..
docker run -e ANTHROPIC_API_KEY=sk-... -p 4310:4310 task-worker
```

## Instinct Lifecycle

- **Startup**: Pulls blessed instinct bundle from orchestrator (if configured)
- **Running**: Claude CLI's continuous-learning hook operates normally
- **Shutdown**: SIGTERM triggers instinct export to orchestrator before exit
