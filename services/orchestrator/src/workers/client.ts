/**
 * @packageDocumentation
 * Worker abstraction interfaces for the executor orchestrator.
 *
 * All worker backends (Docker exec, HTTP, local spawn) implement the same
 * `WorkerClient` interface so the loop runner is backend-agnostic.
 *
 * `WorkerProcess` mirrors the shape of `Bun.spawn` output so that
 * `drainStream()` and `proc.exited` in `runner.ts` work without changes.
 */

import type { BackendDescriptor } from './backend-descriptor.js';

/**
 * A process-like handle returned by `WorkerClient.exec()`.
 * Same shape as `Bun.spawn` output: piped stdout/stderr + exit promise.
 */
export interface WorkerProcess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(): void;
}

/**
 * Optional execution context passed to `WorkerClient.exec()`.
 *
 * Allows callers (e.g. the runner) to pass per-invocation overrides such as
 * a hat-level backend preference without changing the worker's default
 * backend chain.
 */
export interface ExecOptions {
  /**
   * Per-hat backend override. When set, the fallback chain will attempt this
   * backend first (before the configured chain) if its circuit is closed.
   *
   * - A `string` is resolved to a named backend via `BackendFactory.create()`.
   * - A full `BackendDescriptor` is used as-is.
   *
   * Non-fallback `WorkerClient` implementations may ignore this field.
   */
  readonly backendOverride?: string | BackendDescriptor;
}

/**
 * Abstraction over a worker backend (Docker container, K8s pod, local process).
 *
 * The loop runner calls `exec()` for each claude invocation instead of
 * spawning a local subprocess directly.
 */
export interface WorkerClient {
  /** Unique identifier for this worker (container ID, pod name, etc.). */
  readonly workerId: string;

  /**
   * Prepare the workspace for a job. Called once per job before the task loop.
   * Returns the absolute path inside the worker where the repo is checked out.
   */
  prepareWorkspace(branch: string): Promise<string>;

  /**
   * Execute one invocation. Returns a process-like handle with piped
   * stdout/stderr and an exited promise — same shape as Bun.spawn output so
   * runner.ts stays unchanged.
   *
   * @param options - Optional context for per-invocation overrides.
   */
  exec(prompt: string, workDir: string, options?: ExecOptions): Promise<WorkerProcess>;

  /** Clean up workspace after a job completes or fails. */
  cleanWorkspace(): Promise<void>;

  /** Returns false if the worker is unreachable or unhealthy. */
  isHealthy(): Promise<boolean>;
}
