/**
 * Production fallback chain worker client.
 *
 * Implements `WorkerClient` by routing each invocation through an ordered
 * list of `BackendDescriptor` backends. On retryable failures (rate_limit,
 * unknown) the chain falls back to the next eligible backend, guided by the
 * per-backend `CircuitBreaker` and `withExponentialBackoff` delay policy.
 *
 * The runner, pool, and dependency layers see a plain `WorkerClient` and
 * require no changes — backend identity is opaque to callers.
 */

import type { BackendDescriptor } from './backend-descriptor.js';
import type { ExecOptions, WorkerClient, WorkerProcess } from './client.js';
import type { ErrorClass } from './error-classifier.js';
import type { FallbackEventSink } from './fallback-event-sink.js';
import type { StreamHandler } from './stream-handler.js';

import process from 'node:process';

import { BackendDetector } from './backend-detector.js';
import { withExponentialBackoff } from './backoff.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { classifyExitError } from './error-classifier.js';
import { ConsoleFallbackEventSink } from './fallback-event-sink.js';
import { selectStreamParser } from './parsers/index.js';
import { resolveBackendOverride } from './resolve-backend-override.js';

// ---------------------------------------------------------------------------
// ClassifiedError
// ---------------------------------------------------------------------------

/**
 * Error subclass carrying the classified error type, stderr context,
 * and backend identity. Thrown by `bufferAndRun` on non-zero exit;
 * caught by the fallback loop to decide retry vs propagate.
 */
export class ClassifiedError extends Error {
  constructor(
    readonly errorClass: ErrorClass,
    readonly stderrText: string,
    readonly exitCode: number | null,
    readonly backendName: string,
  ) {
    super(
      `Backend '${backendName}' exited with code ${exitCode} [${errorClass}]: ${stderrText.slice(0, 200)}`,
    );
    this.name = 'ClassifiedError';
  }
}

// ---------------------------------------------------------------------------
// BufferedRunResult
// ---------------------------------------------------------------------------

interface BufferedRunResult {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly exitCode: number;
}

// ---------------------------------------------------------------------------
// ProcessSpawner — injectable subprocess abstraction
// ---------------------------------------------------------------------------

/**
 * Minimal interface for spawning a backend subprocess. Production code
 * uses `Bun.spawn`; tests inject a stub that returns controlled output.
 */
export interface ProcessSpawner {
  spawn(
    command: string,
    args: readonly string[],
    options: {
      stdin?: Uint8Array;
      cwd: string;
      env?: Record<string, string>;
    },
  ): {
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>;
    kill(): void;
  };
}

const defaultSpawner: ProcessSpawner = {
  spawn(command, args, options) {
    const proc = Bun.spawn([command, ...args], {
      stdin: options.stdin,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });
    return {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exited: proc.exited,
      kill: () => proc.kill(),
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildArgs(
  backend: BackendDescriptor,
  prompt: string,
): { args: readonly string[]; stdin?: Uint8Array } {
  switch (backend.promptMode) {
    case 'flag':
      return { args: [...backend.args, '-p', prompt] };
    case 'stdin':
      return { args: [...backend.args], stdin: new TextEncoder().encode(prompt) };
    case 'positional':
      return { args: [...backend.args, prompt] };
  }
}

async function drainToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      if (bytes.length > 0) controller.enqueue(bytes);
      controller.close();
    },
  });
}

/**
 * Normalises raw backend output by running it through the appropriate
 * stream parser and collecting text fragments. Structured formats
 * (e.g. Claude NDJSON) are reduced to plain text; plain-text backends
 * pass through unchanged.
 */
function normalizeOutput(raw: Uint8Array, backend: BackendDescriptor): Uint8Array {
  if (backend.outputFormat === 'text') return raw;

  const decoder = new TextDecoder();
  const rawText = decoder.decode(raw);
  if (rawText.trim() === '') return raw;

  const parser = selectStreamParser(backend.outputFormat);
  const chunks: string[] = [];
  const collector: StreamHandler = {
    onText: (text) => chunks.push(text),
    onToolCall: () => {},
    onToolResult: () => {},
    onError: () => {},
    onComplete: () => {},
  };
  parser(rawText, collector);

  // If the parser extracted no text (e.g. unknown format), fall back to raw
  if (chunks.length === 0) return raw;

  return new TextEncoder().encode(chunks.join(''));
}

function reconstructWorkProcess(
  result: BufferedRunResult,
  backend: BackendDescriptor,
): WorkerProcess {
  const normalizedStdout = normalizeOutput(result.stdout, backend);

  return {
    stdout: bytesToStream(normalizedStdout),
    stderr: bytesToStream(result.stderr),
    exited: Promise.resolve(result.exitCode),
    kill: () => {
      /* no-op: process already exited */
    },
  };
}

// ---------------------------------------------------------------------------
// FallbackChainWorkerClient
// ---------------------------------------------------------------------------

interface FallbackChainOptions {
  readonly baseDelayMs?: number;
  readonly factor?: number;
  readonly jitter?: number;
}

const DEFAULT_FALLBACK_OPTIONS: Required<FallbackChainOptions> = {
  baseDelayMs: 500,
  factor: 2,
  jitter: 0.2,
};

/**
 * Worker client that routes invocations through an ordered list of backend
 * descriptors, falling back to the next eligible backend on retryable errors.
 *
 * Uses {@link CircuitBreaker} to skip recently-failed backends and
 * {@link withExponentialBackoff} to space retry attempts. Non-retryable
 * errors (`auth_failure`, `task_error`) propagate immediately.
 */
export class FallbackChainWorkerClient implements WorkerClient {
  readonly workerId: string;
  private readonly backends: readonly BackendDescriptor[];
  private readonly circuitBreaker: CircuitBreaker;
  private readonly detector: BackendDetector;
  private readonly spawner: ProcessSpawner;
  private readonly options: Required<FallbackChainOptions>;
  private readonly eventSink: FallbackEventSink;

  private lastSuccessfulBackend: string;

  constructor(
    workerId: string,
    backends: readonly BackendDescriptor[],
    circuitBreaker: CircuitBreaker,
    detector: BackendDetector,
    spawner: ProcessSpawner = defaultSpawner,
    options: FallbackChainOptions = {},
    eventSink: FallbackEventSink = new ConsoleFallbackEventSink(),
  ) {
    if (backends.length === 0) {
      throw new Error('At least one backend is required');
    }

    this.workerId = workerId;
    this.backends = backends;
    this.circuitBreaker = circuitBreaker;
    this.detector = detector;
    this.spawner = spawner;
    this.options = { ...DEFAULT_FALLBACK_OPTIONS, ...options };
    this.eventSink = eventSink;
    this.lastSuccessfulBackend = backends[0]?.name ?? '';
  }

  /**
   * Selects the first eligible backend from the configured chain whose
   * circuit is not open. Returns `null` when all backends have open circuits.
   */
  selectEligibleBackend(): BackendDescriptor | null {
    return this.selectEligibleBackendFrom(this.backends);
  }

  /**
   * Spawns the backend subprocess, buffers stdout and stderr, and awaits exit.
   * Throws `ClassifiedError` on non-zero exit.
   */
  async bufferAndRun(
    backend: BackendDescriptor,
    prompt: string,
    workDir: string,
  ): Promise<BufferedRunResult> {
    const { args, stdin } = buildArgs(backend, prompt);

    const proc = this.spawner.spawn(backend.command, args, {
      stdin,
      cwd: workDir,
      env: Object.keys(backend.envVars).length > 0
        ? backend.envVars
        : undefined,
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      drainToBytes(proc.stdout),
      drainToBytes(proc.stderr),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      const stderrText = new TextDecoder().decode(stderr);
      const errorClass = classifyExitError(exitCode, stderrText);
      throw new ClassifiedError(errorClass, stderrText, exitCode, backend.name);
    }

    return { stdout, stderr, exitCode };
  }

  /**
   * Builds the effective backend list for a single invocation.
   *
   * When a `backendOverride` is provided via `ExecOptions`, the override
   * backend is prepended to the configured chain (deduplicated by name)
   * so it is attempted first. If absent, the configured chain is returned
   * unchanged.
   */
  private buildEffectiveBackends(
    options?: ExecOptions,
  ): readonly BackendDescriptor[] {
    if (!options?.backendOverride) return this.backends;

    const resolved = resolveBackendOverride(options.backendOverride);
    // Deduplicate: if the override matches a backend already in the chain,
    // move it to the front rather than duplicating it.
    const rest = this.backends.filter((b) => b.name !== resolved.name);
    return [resolved, ...rest];
  }

  /**
   * Selects the first eligible backend from the given list whose circuit
   * is not open.
   */
  private selectEligibleBackendFrom(
    backends: readonly BackendDescriptor[],
  ): BackendDescriptor | null {
    for (const backend of backends) {
      if (!this.circuitBreaker.isOpen(backend.name)) {
        return backend;
      }
    }
    return null;
  }

  /**
   * Runs the prompt against the fallback chain.
   *
   * Flow:
   *   1. Select eligible backend (first with closed circuit)
   *   2. Buffer and run subprocess
   *   3a. Success -> record success, return reconstructed WorkerProcess
   *   3b. Failure -> classify error:
   *       - rate_limit / unknown: record failure, backoff, retry next backend
   *       - auth_failure / task_error: propagate immediately
   *   4. All backends exhausted -> throw last ClassifiedError
   *
   * When `options.backendOverride` is set, the override backend is prepended
   * to the chain so it is attempted first.
   */
  async exec(
    prompt: string,
    workDir: string,
    options?: ExecOptions,
  ): Promise<WorkerProcess> {
    const effectiveBackends = this.buildEffectiveBackends(options);
    let lastError: ClassifiedError | undefined;
    let successBackend: BackendDescriptor | undefined;
    let attempt = 0;
    const startTime = Date.now();

    const buffered = await withExponentialBackoff(
      async () => {
        attempt++;
        const backend = this.selectEligibleBackendFrom(effectiveBackends);

        if (backend === null) {
          if (lastError) {
            this.eventSink.emit({
              type: 'chain_exhausted',
              lastBackend: lastError.backendName,
              lastErrorClass: lastError.errorClass,
              totalAttempts: attempt - 1,
              timestamp: Date.now(),
            });
          }
          throw lastError ?? new Error('No eligible backends available');
        }

        this.eventSink.emit({
          type: 'backend_selected',
          backendName: backend.name,
          attempt,
          timestamp: Date.now(),
        });

        try {
          const result = await this.bufferAndRun(backend, prompt, workDir);
          this.circuitBreaker.recordSuccess(backend.name);
          this.lastSuccessfulBackend = backend.name;
          successBackend = backend;

          this.eventSink.emit({
            type: 'chain_success',
            backendName: backend.name,
            attempt,
            durationMs: Date.now() - startTime,
            timestamp: Date.now(),
          });

          return result;
        } catch (err) {
          if (err instanceof ClassifiedError) {
            this.eventSink.emit({
              type: 'backend_failed',
              backendName: backend.name,
              errorClass: err.errorClass,
              exitCode: err.exitCode,
              attempt,
              timestamp: Date.now(),
            });

            if (
              err.errorClass === 'rate_limit' ||
              err.errorClass === 'unknown'
            ) {
              this.circuitBreaker.recordFailure(backend.name);

              // Peek at the next eligible backend for the fallback event
              const next = this.selectEligibleBackendFrom(effectiveBackends);
              if (next !== null) {
                this.eventSink.emit({
                  type: 'backend_fallback',
                  failedBackend: backend.name,
                  nextBackend: next.name,
                  errorClass: err.errorClass,
                  attempt,
                  timestamp: Date.now(),
                });
              }
            }
            lastError = err;
            throw err;
          }
          throw err;
        }
      },
      {
        maxRetries: effectiveBackends.length - 1,
        baseDelayMs: this.options.baseDelayMs,
        factor: this.options.factor,
        jitter: this.options.jitter,
        shouldRetry: (err) => {
          if (err instanceof ClassifiedError) {
            return (
              err.errorClass === 'rate_limit' || err.errorClass === 'unknown'
            );
          }
          return false;
        },
      },
    );

    // successBackend is always set when withExponentialBackoff resolves
    return reconstructWorkProcess(buffered, successBackend!);
  }

  // -------------------------------------------------------------------------
  // WorkerClient lifecycle — workspace ops are caller-managed
  // -------------------------------------------------------------------------

  /** No-op — workspace lifecycle is managed by the caller. Returns the branch unchanged. */
  async prepareWorkspace(branch: string): Promise<string> {
    return branch;
  }

  /** No-op — workspace cleanup is managed by the caller. */
  async cleanWorkspace(): Promise<void> {
    // No-op — workspace cleanup is handled by the caller
  }

  /** Returns `true` when at least one configured backend command is available on the host. */
  async isHealthy(): Promise<boolean> {
    const available = await this.detector.detect(
      this.backends.map((b) => b.command),
    );
    return available.length > 0;
  }

  /** The name of the backend that handled the most recent successful invocation. */
  activeBackend(): string {
    return this.lastSuccessfulBackend;
  }
}
