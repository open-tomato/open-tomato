/**
 * @packageDocumentation
 * Hook executor — spawns external hook processes and evaluates their results.
 *
 * `HookExecutor` is responsible for the low-level lifecycle of a single hook
 * invocation: spawning the process, delivering the payload via stdin,
 * enforcing the per-hook timeout, capturing output, and translating the exit
 * code into an orchestration disposition.
 */

import type { HookPayload, HookPhase, HookResult, HookSpec } from './types.js';

// ---------------------------------------------------------------------------
// Logger interface
// ---------------------------------------------------------------------------

/**
 * Minimal structured-logging interface accepted by `HookExecutor`.
 * Matches the shape of `console` so callers can pass `console` directly or
 * substitute a structured logger such as pino.
 */
export interface Logger {
  /** Emits an informational message. */
  log(message: string, ...args: unknown[]): void;
  /** Emits a warning message. */
  warn(message: string, ...args: unknown[]): void;
  /** Emits an error message. */
  error(message: string, ...args: unknown[]): void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface SpawnResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// ---------------------------------------------------------------------------
// HookExecutor
// ---------------------------------------------------------------------------

/**
 * Executes hook commands registered for a given lifecycle phase.
 *
 * Construct one instance per orchestration session and call {@link runPhase}
 * at each lifecycle point. Accumulated metadata flows forward through the
 * hook chain within a phase, enabling hooks to pass state to successors.
 *
 * @example
 * ```typescript
 * const executor = new HookExecutor(specs, console);
 * const { metadata, blocked } = await executor.runPhase('pre.loop.start', payload);
 * if (blocked) process.exit(1);
 * ```
 */
export class HookExecutor {
  private readonly logger: Logger;

  /**
   * @param _specs - Array of hook specifications available to this executor.
   *   The full list is accepted here for symmetry with `HookEngine`, which
   *   owns phase-to-spec mapping and passes filtered subsets into `runPhase`.
   * @param logger - Logger used for warn/error output; defaults to `console`.
   */
  constructor(_specs: HookSpec[], logger: Logger = console) {
    this.logger = logger;
  }

  // -------------------------------------------------------------------------
  // Private: spawn
  // -------------------------------------------------------------------------

  /**
   * Attempts to spawn the given command, retrying up to `maxRetries` times
   * when the OS reports ETXTBSY (text file busy). All other errors are
   * re-thrown immediately.
   *
   * @param command - Executable path or name.
   * @param args - Argument list to forward to the process.
   * @param options - Optional cwd and env overrides.
   * @returns The spawned process handle.
   */
  private async spawnWithEtxtbsyRetry(
    command: string,
    args: string[],
    options: { cwd?: string; env?: Record<string, string> },
  ): Promise<ReturnType<typeof Bun.spawn>> {
    const maxRetries = 3;
    const retryDelayMs = 50;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return Bun.spawn([command, ...args], {
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'pipe',
          cwd: options.cwd,
          env: { ...Bun.env, ...(options.env ?? {}) },
        });
      } catch (err: unknown) {
        const isEtxtbsy =
          err instanceof Error && 'code' in err && (err as { code?: string }).code === 'ETXTBSY';

        if (isEtxtbsy && attempt < maxRetries) {
          await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        throw err;
      }
    }

    // Unreachable — loop always returns or throws before exhausting attempts.
    throw new Error(`Failed to spawn "${command}" after ${maxRetries} retries`);
  }

  /**
   * Spawns the hook process, delivers the payload via stdin, and captures
   * stdout/stderr up to `max_output_bytes`.
   *
   * @param spec - Hook specification describing the command and options.
   * @param payload - JSON payload to deliver via stdin.
   * @returns Spawn result with exit code, captured output, and timeout flag.
   */
  private async spawnHook(spec: HookSpec, payload: HookPayload): Promise<SpawnResult> {
    const maxBytes = spec.max_output_bytes ?? 65_536;
    let timedOut = false;

    const proc = await this.spawnWithEtxtbsyRetry(spec.command, spec.args ?? [], {
      cwd: spec.cwd,
      env: spec.env,
    });

    const input = JSON.stringify(payload);
    const stdin = proc.stdin as import('bun').FileSink;
    stdin.write(input);
    stdin.end();

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, spec.timeoutMs);

    const stdout = proc.stdout as ReadableStream<Uint8Array>;
    const stderr = proc.stderr as ReadableStream<Uint8Array>;

    try {
      const [exitCode, rawStdout, rawStderr] = await Promise.all([
        proc.exited,
        new Response(stdout).text(),
        new Response(stderr).text(),
      ]);

      return {
        exitCode,
        stdout: rawStdout.slice(0, maxBytes),
        stderr: rawStderr.slice(0, maxBytes),
        timedOut,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  // -------------------------------------------------------------------------
  // Private: disposition resolution
  // -------------------------------------------------------------------------

  /**
   * Derives the orchestration disposition from the raw spawn outcome.
   *
   * This is a pure function with no side effects: it maps `(timedOut,
   * exitCode, onError)` to a `HookResult['disposition']` value without
   * logging or mutating any state.
   *
   * @param timedOut - Whether the process was killed due to timeout.
   * @param exitCode - Process exit code, or `null` if the process was killed.
   * @param onError - Configured failure mode from the hook spec.
   * @returns Resolved disposition string.
   */
  private resolveDisposition(
    timedOut: boolean,
    exitCode: number | null,
    onError: HookSpec['on_error'],
  ): HookResult['disposition'] {
    if (timedOut) return 'timeout';
    if (exitCode === 0) return 'continue';
    switch (onError) {
      case 'warn': return 'warn';
      case 'block': return 'block';
      case 'suspend': return 'suspend';
      default: return 'warn';
    }
  }

  // -------------------------------------------------------------------------
  // Private: mutation parsing
  // -------------------------------------------------------------------------

  /**
   * Attempts to parse hook stdout as a JSON object for metadata mutation.
   * Returns `null` when stdout is empty, whitespace-only, or not valid JSON,
   * without throwing.
   *
   * @param stdout - Raw stdout string captured from the hook process.
   * @returns Parsed JSON record or `null`.
   */
  private parseStdoutMutation(stdout: string): Record<string, unknown> | null {
    const trimmed = stdout.trim();
    if (trimmed.length === 0) return null;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Public: runHook
  // -------------------------------------------------------------------------

  /**
   * Invokes a single hook for a specific phase, measures its duration, and
   * resolves the orchestration disposition from the exit code and `on_error`
   * mode. When `mutate.enabled` is true and stdout contains a valid JSON
   * object, the parsed patch is merged into `accumulatedMetadata`.
   *
   * @param spec - Hook configuration.
   * @param phase - Lifecycle phase at which the hook is being invoked.
   * @param payload - Payload delivered to the hook via stdin.
   * @param accumulatedMetadata - Metadata accumulated from prior hooks in this
   *   phase; mutated in-place when the hook emits a JSON stdout patch.
   * @returns Completed `HookResult` including disposition and any applied mutation.
   */
  async runHook(
    spec: HookSpec,
    phase: HookPhase,
    payload: HookPayload,
    accumulatedMetadata: Record<string, unknown>,
  ): Promise<HookResult> {
    const startMs = Date.now();

    const { exitCode, stdout, stderr, timedOut } = await this.spawnHook(spec, payload);

    const durationMs = Date.now() - startMs;
    const disposition = this.resolveDisposition(timedOut, exitCode, spec.on_error);

    let mutationApplied: Record<string, unknown> | undefined;

    if (disposition === 'timeout') {
      this.logger.warn(
        `[hooks] "${spec.name}" timed out after ${spec.timeoutMs}ms (phase: ${String(phase)})`,
      );
    }

    if (spec.mutate?.enabled && (disposition === 'continue' || disposition === 'warn')) {
      const patch = this.parseStdoutMutation(stdout);
      if (patch !== null) {
        Object.assign(accumulatedMetadata, patch);
        mutationApplied = patch;
      }
    }

    return {
      hookName: spec.name,
      phase,
      exitCode,
      stdout,
      stderr,
      durationMs,
      disposition,
      ...(mutationApplied !== undefined
        ? { mutationApplied }
        : {}),
    };
  }

  // -------------------------------------------------------------------------
  // Public: runPhase
  // -------------------------------------------------------------------------

  /**
   * Iterates all hook specs registered for `phase` in order, chaining
   * accumulated metadata between them. Halts immediately on the first hook
   * that returns a `block` or `suspend` disposition.
   *
   * @param phase - Lifecycle phase being fired.
   * @param hooks - Subset of specs applicable to this phase (caller filters).
   * @param payload - Base payload for this phase invocation.
   * @returns Final merged metadata plus block/suspend flags.
   */
  async runPhase(
    phase: HookPhase,
    hooks: HookSpec[],
    payload: HookPayload,
  ): Promise<{ metadata: Record<string, unknown>; blocked: boolean; suspended: boolean }> {
    const accumulatedMetadata: Record<string, unknown> = { ...payload.metadata };

    for (const spec of hooks) {
      const phasePayload: HookPayload = {
        ...payload,
        metadata: { ...accumulatedMetadata },
      };

      const result = await this.runHook(spec, phase, phasePayload, accumulatedMetadata);

      if (result.disposition === 'block') {
        this.logger.error(
          `[hooks] "${spec.name}" blocked phase "${phase}" (exit ${String(result.exitCode)}): ${result.stderr.slice(0, 200)}`,
        );
        return { metadata: accumulatedMetadata, blocked: true, suspended: false };
      }

      if (result.disposition === 'suspend') {
        this.logger.warn(
          `[hooks] "${spec.name}" suspended phase "${phase}" (exit ${String(result.exitCode)})`,
        );
        return { metadata: accumulatedMetadata, blocked: false, suspended: true };
      }

      if (result.disposition === 'warn' || result.disposition === 'timeout') {
        this.logger.warn(
          `[hooks] "${spec.name}" non-fatal failure on phase "${phase}" (disposition: ${result.disposition})`,
        );
      }
    }

    return { metadata: accumulatedMetadata, blocked: false, suspended: false };
  }
}
