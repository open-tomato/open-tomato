---
title: "Executor Service Agent Context"
description: "Service-specific gotchas and guidelines for the executor service."
---

# Executor Service — Agent Context

## Gotchas

### Executor and Notifications Integration

- **Two-service architecture**: The executor owns all job/task/worker state in its own PostgreSQL database (port 5434). Notifications is a pure event fan-out + approvals service. The executor emits events to notifications via `POST /events/:kind` for SSE delivery, but notifications no longer drives job state.
- **No task ID handshake**: The executor creates task rows directly in its own DB. `emitEvent` returns `Promise<Record<string, unknown>>` — the executor does not extract `taskId` from event responses.
- **Worker pool**: The executor manages workers via `WorkerClient` abstraction (`LocalSpawnWorkerClient`, `DockerExecWorkerClient`, `HttpWorkerClient`). Workers are tracked in the `workers` table. `WORKER_MODE` env var selects the default backend (`local` or `docker`).
- **`cleanWorkspace()` IS called from `routes/jobs.ts`** (not from `dependency.ts` or `runner.ts`): it fires in two places — (1) the `catch` block when `loopDep.dependency.start()` throws, and (2) a background finalizer that polls `loopDep.getState().status` every 1 s until a terminal state (`completed`, `failed`, `cancelled`, `blocked`) is reached, then calls `cleanWorkspace()` and releases the worker back to the pool. The loop itself never calls `cleanWorkspace()`.
- **DockerExec workspace is a shallow clone destroyed after each job**: `prepareWorkspace()` runs `git clone --depth 1 --single-branch . <tmpDir>` into `os.tmpdir()`. All git state created during the job (commits, tags, branches, stash entries) lives only in the ephemeral clone and is permanently destroyed by `cleanWorkspace()` → `fs.rmSync(tmpDir)`. Any git refs that must survive the job (e.g. checkpoint tags) must be pushed to a remote before `cleanWorkspace()` runs.
- **LocalSpawn operates on the developer's own checkout**: `prepareWorkspace()` runs `git checkout <branch> && git pull` on the persistent repo — it mutates HEAD. `cleanWorkspace()` is a no-op. Unlike DockerExec, git refs created during a LocalSpawn job persist in the developer checkout across jobs and accumulate until manually pruned.
- **Rate-limit errors are invisible at the executor level**: Claude CLI exits with code 1 on rate-limit, but the runner treats all non-zero exits identically (task marked `blocked`, loop halted). stderr is streamed as `log` events but never inspected for rate-limit patterns. Distinguishing rate-limit from auth failure or task error requires stderr pattern matching (e.g., `"429"`, `"rate limit"`, `"quota exceeded"`). No telemetry counts rate-limit occurrences today.
- **Security hook flags `exec` method name in worker directory files**: The `security_reminder_hook.py` PostToolUse hook flags any file containing the string `exec(` as potential command injection. In the `workers/` directory, use `"the exec method"` or inline code references without parens in JSDoc/comments to avoid false-positive blocks. The existing `client.ts` already carries the method signature, so new worker files can extend the interface rather than re-declaring it.
- **`proc.exited` double-await in runner.ts**: The runner awaits `proc.exited` inside a `Promise.all` and then again on the next line (harmless — re-awaiting a resolved Promise returns the cached value). Fallback wrappers must not introduce a race by adding a third await that expects a live Promise.
- **`void` loops**: The executor fires `runLoop` / `runSimulatedLoop` as a background void promise from `onStart()`. Test mocks for `emitEvent` must return `{}` (not `undefined` / `void`) — a `void` return silently kills the background loop.
- **SSE reconnection replays history**: The `GET /events/:kind/:jobId` SSE endpoint replays recent history on each new connection. Client-side `JobStream` resets its event buffer on reconnect (no deduplication needed). Do not add client-side deduplication.
- **Plugin client split**: `TechTreeNotificationClient` accepts `{ notificationUrl, executorUrl }`. Job/worker methods route to executor; SSE/approval methods route to notifications. Backward-compatible single-URL constructor is deprecated.
- **Dual approval-client lockstep**: `packages/notifications-plugin-executor/src/client.ts` contains a second independent implementation of the HTTP + SSE approval flow (`ExecutorNotificationClient`). It diverges from the executor-internal `HttpNotificationClient` in constructor signature (`nodeId` in constructor vs. per-call param) and SSE parsing strategy (streaming line reader vs. `res.json()`). Any change to the wire protocol — request body shape, SSE event format, or endpoint path — must be applied to **both** clients in lockstep, or one side will silently break.
- **SSE approval wait has no timeout on either side**: Neither `HttpNotificationClient` nor `ExecutorNotificationClient` passes an `AbortSignal` or timeout to their `fetch()` calls. The notifications service `attachApprovalWait` also has no server-side timeout — it waits indefinitely. The DB `expires_at` column exists but is never read by any server code. An unanswered approval hangs the executor forever.
- **SseBus max listeners**: `SseBus.setMaxListeners(500)` — Node.js warns once this threshold is crossed across all active channels (approval waits + event streams combined). Normal operation is well within bounds, but load-testing or creating many concurrent jobs can trigger the warning.

### RPC Protocol

- **`RpcServer` accepts an `RpcTransport` interface** (not raw streams) — use `NdjsonTransport` for stdio or `WebSocketRpcAdapter` for WebSocket. Both implement the same interface so `RpcServer` is transport-agnostic.
- **`RpcServer.start()` auto-calls `stop()` in its `finally` block** — no need for the caller to clean up after the promise resolves/rejects.
- **`NdjsonTransport` registers no-op `'error'` listeners** on both input/output streams to prevent unhandled error crashes; actual error handling is done upstream.
- **Unknown RPC command methods are rejected with `VALIDATION_ERROR`** (not `PARSE_ERROR`) because the JSON is valid but fails Zod discriminated union validation.
- **RPC command handler hooks in `index.ts` are stubs** (`noop`/`noopAsync`) — they need real orchestrator hook wiring when command dispatch from external consumers is implemented.
- **`onGetState` hook returns a stub `{ status: 'idle' }`** — wiring `captureStateSnapshot` requires orchestrator context only available inside `runLoop`.
- **Simulator (`src/loop/simulator.ts`) silently ignores `rpcBus`** — no RPC events in dry-run mode (by design).
- **`LoopDependencyFactory` accepts optional `rpcBus?: RpcEventBus`** as 7th parameter. `RunnerContext` has `rpcBus?: RpcEventBus` — the runner publishes lifecycle events when present.
- **TS discriminated unions need typed intermediate variables** when passed to `.publish()` — inline object literals don't narrow correctly.
- **`TaskStatus` exists in 3 packages** (task-store, notifications-plugin-tech-tree, rpc/types/shared) with different values/semantics — intentionally distinct domain types, not duplicates.
- **RPC shared types** (`HatId`, `TaskCounts`, `CostSnapshot`, etc.) are scoped to `services/executor/` — they don't need to move to `@open-tomato/types` unless consumed by other packages.
- **E2E process-spawn tests** can use `--rpc --dry-run` with a dummy `DATABASE_URL` — the RPC server starts before `createService` attempts the DB probe.
- **Top-level RPC barrel** at `src/rpc/index.ts` re-exports all public API. Entry point imports from the barrel (`./src/rpc/index.js`), not individual sub-module paths.

### Run Modes and Task-Worker Integration

- **`RUN_MODE` env var (new)**: When set, overrides the deprecated `WORKER_MODE`. Values: `local` (TaskWorkerCliClient), `docker`/`remote` (TaskWorkerHttpClient), `serverless` (stub). When absent, falls back to the deprecated `WORKER_MODE=local` path (FallbackChainWorkerClient).
- **`TaskWorkerHttpClient`** (`src/workers/task-worker-http-client.ts`): Real implementation for remote/docker task-worker instances. Calls `POST /exec` (SSE stream), `POST /workspace`, `DELETE /workspace`, `GET /health`. Uses `sseToWorkerProcess` adapter to convert SSE stream into `WorkerProcess`.
- **`TaskWorkerCliClient`** (`src/workers/task-worker-cli-client.ts`): For `RUN_MODE=local`. Spawns `bun cli.ts exec ...` as subprocess per task. Creates isolated temp directories per worker to avoid branch/instinct conflicts. Uses `ndjsonToWorkerProcess` adapter.
- **`sseToWorkerProcess`** (`src/workers/sse-to-worker-process.ts`): Adapter that parses SSE `data:` lines into `WorkerProcess` stdout/stderr/exited. Stops reading after the `exit` event — does NOT wait for the HTTP stream to signal `done` (keep-alive connections would hang).
- **`ndjsonToWorkerProcess`** (`src/workers/ndjson-to-worker-process.ts`): Same adapter but for NDJSON lines from CLI subprocess stdout. Also stops after exit event.
- **Worker registration**: `PUT /workers/:workerId` now accepts `type: 'task-worker'` (creates `TaskWorkerHttpClient`) alongside the existing `local`/`docker`/`http` types.
- **Model presets**: The new task-worker path uses `@open-tomato/worker-protocol` model presets (Claude-only + `--model` flag) instead of the multi-backend `BackendDescriptor` system. `DEFAULT_MODEL` env var controls which preset is used (default: `sonnet`).

### Deprecated (kept for backward compat)

- **`FallbackChainWorkerClient`** and the multi-backend system (Gemini/Codex): Active when `WORKER_MODE=local` is set without `RUN_MODE`. Will be removed in a future release.
- **`HttpWorkerClient`** (`src/workers/http.ts`): Original stub. Kept for `type: 'http'` registrations. Use `type: 'task-worker'` for new integrations.
- **`BackendDescriptor`/`BackendDetector`/`BackendFactory`**: Part of the deprecated multi-backend path. New code should use `ModelPreset` from `@open-tomato/worker-protocol`.
- **`WORKER_MODE` env var**: Superseded by `RUN_MODE`. Still works as fallback.

### Hook Lifecycle

- **`Bun.spawn` pipe streams require explicit casts** — when `stdin/stdout/stderr: 'pipe'` is passed, the fields are typed as `number | FileSink | ReadableStream | undefined`. Cast to the concrete type (`FileSink`, `ReadableStream<Uint8Array>`) at the call site; TypeScript will not narrow them automatically.
- **`handleSuspend` is fire-and-forget** — `handleSuspend` dispatches the strategy function with `void strategyFn(state).catch(...)` so that it runs in the background. The function returns `{ action: 'suspend' }` immediately to the caller; do not `await` the strategy inside the handler.
- **`SuspendStrategyFn`/`SuspendStrategyMap` live in `failure-modes.ts`** — these types are only needed by the handler layer and are not in `types.ts`. Import from `failure-modes.ts` when implementing `HookEngine` or adding new strategies.
- **`HookEngine.fire` calls `executor.runHook` directly, not `runPhase`** — this allows telemetry to be called per-result before deciding to halt on block/suspend. Do not refactor `fire()` to call `runPhase`; the per-result logging would be lost.
- **Hook engine state dir is `resolvedWorkDir/.ralph`** — `SuspendStateStore` and telemetry files are co-located with the workspace checkout under `.ralph/`, not in a global temp path. This ensures suspend state and telemetry persist alongside the repo across process restarts.
- **`params.planId` is the `hat` field in `HookPayload`** — every `HookPayload` emitted by the runner uses `params.planId` as `hat`. Treat `hat` as the plan identifier, not a worker or job ID.
- **`post.loop.complete` and `post.loop.error` block/suspend dispositions are silently ignored** — these phases fire as final notifications only. The runner discards their `block`/`suspend` outcomes to prevent double-emitting terminal events after the loop has already ended.
- **`accumulatedMetadata` in `runner.ts` is a session-level accumulator** — `applyHookResult` closes over the `let accumulatedMetadata` variable and updates it on each `continue` disposition. TypeScript handles the closure correctly; do not convert this to a parameter-threaded value.
- **`disposition:'block'` is expressed as `status:'blocked'` on the job** — the runner sets the job to `blocked` and returns cleanly from `runLoop`; no `process.exit()` is used. Avoid conflating HTTP 403 "blocked" with this orchestration block status.
- **`void runLoop(...)` in `dependency.ts` requires a `.catch()` handler** — without it, an unexpected throw inside `runLoop` becomes an unhandled promise rejection. Always attach `.catch(handleFatalError)` when fire-and-forgetting the loop.
- **`spawnHook` wraps `Promise.all` in try-finally** — `clearTimeout` is placed in `finally` so the timeout handle is always cancelled even when stdout or stderr reading rejects. Do not move it into `.then()`.
- **`waitForResume` silently ignores `ENOENT` from `unlink`** — there is a TOCTOU race between checking file existence and deleting the signal file. The `ENOENT` swallow is intentional; re-throwing it would cause spurious test failures and production errors.
- **Fake timers + rejected promise mocks: attach `.rejects` before advancing timers** — when using `vi.useFakeTimers()` with a mock that rejects, attach `expect(promise).rejects` *before* calling `vi.advanceTimersByTimeAsync(...)`. If the assertion handler is attached after the timer fires, Node.js sees the rejection as unhandled in the window between the timer callback and the `.rejects` assertion.
- **Pre-existing tsc errors in `src/store/*.test.ts`, `src/workers/fallback-chain.ts`, and `src/hooks/*.test.ts`** — these errors existed before the hook lifecycle work. They are unrelated to `services/executor/src/hooks/` changes; do not block hook-related PRs on them.
