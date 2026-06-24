import type {
  AgentOutputEvent,
  OrchestrationEvent,
  PerformanceEvent,
  ErrorEvent,
  HookRunEvent,
} from './types.js';

import { join } from 'node:path';

import { JsonlWriter } from './jsonl-writer.js';
import { PromptLogWriter } from './prompt-log-writer.js';
import { initSessionDir } from './session.js';

/**
 * Base directory for all diagnostics session data.
 * Resolved relative to the process working directory at runtime.
 */
const DEFAULT_BASE_DIR = '.diagnostics';

/**
 * Structured telemetry collector for the Ralph orchestration pipeline.
 *
 * The collector is a singleton activated exclusively when the
 * `RALPH_DIAGNOSTICS=1` environment variable is set.  When disabled,
 * {@link DiagnosticsCollector.getInstance} returns `null` and all record
 * methods become no-ops, so call sites can use optional chaining without
 * any conditional logic.
 *
 * Each enabled session creates an isolated timestamped subdirectory under
 * `.diagnostics/` and rotates old sessions so that at most five are retained.
 *
 * @example
 * ```typescript
 * const diag = DiagnosticsCollector.getInstance();
 * await diag?.init();
 * await diag?.recordOrchestration({ event: 'HatSelected', hat, iterationId, ts: '', sessionId: '' });
 * ```
 */
export class DiagnosticsCollector {
  private static instance: DiagnosticsCollector | null = null;

  private sessionDir: string | null = null;
  private agentOutputWriter: JsonlWriter | null = null;
  private orchestrationWriter: JsonlWriter | null = null;
  private performanceWriter: JsonlWriter | null = null;
  private errorsWriter: JsonlWriter | null = null;
  private hookRunsWriter: JsonlWriter | null = null;
  private promptLogWriter: PromptLogWriter | null = null;

  private constructor() {}

  /**
   * Returns `true` when the `RALPH_DIAGNOSTICS` environment variable is set
   * to `'1'`.
   *
   * @returns `true` if diagnostics are enabled, `false` otherwise.
   */
  static isEnabled(): boolean {
    return process.env['RALPH_DIAGNOSTICS'] === '1';
  }

  /**
   * Return the singleton `DiagnosticsCollector` instance, or `null` when
   * diagnostics are disabled.
   *
   * The instance is created lazily on the first call and reused for the
   * lifetime of the process.  Callers must invoke {@link DiagnosticsCollector.init}
   * before using any record methods.
   *
   * @returns The shared instance, or `null` if `RALPH_DIAGNOSTICS !== '1'`.
   */
  static getInstance(): DiagnosticsCollector | null {
    if (!DiagnosticsCollector.isEnabled()) return null;
    if (!DiagnosticsCollector.instance) {
      DiagnosticsCollector.instance = new DiagnosticsCollector();
    }
    return DiagnosticsCollector.instance;
  }

  /**
   * @internal Resets the singleton — used only in tests.
   */
  static _reset(): void {
    DiagnosticsCollector.instance = null;
  }

  /**
   * Initialize the session directory and all writer instances.
   *
   * Must be called once after {@link DiagnosticsCollector.getInstance} before
   * any record methods are used.  Calling `init` more than once on the same
   * instance is a no-op.
   *
   * @param baseDir - Optional override for the base diagnostics directory.
   *   Defaults to `.diagnostics` in the current working directory.
   * @returns A promise that resolves once the session directory and all
   *   writers are ready.
   */
  async init(baseDir: string = DEFAULT_BASE_DIR): Promise<void> {
    if (this.sessionDir !== null) return;

    this.sessionDir = await initSessionDir(baseDir);

    this.agentOutputWriter = new JsonlWriter(join(this.sessionDir, 'agent-output.jsonl'));
    this.orchestrationWriter = new JsonlWriter(join(this.sessionDir, 'orchestration.jsonl'));
    this.performanceWriter = new JsonlWriter(join(this.sessionDir, 'performance.jsonl'));
    this.errorsWriter = new JsonlWriter(join(this.sessionDir, 'errors.jsonl'));
    this.hookRunsWriter = new JsonlWriter(join(this.sessionDir, 'hook-runs.jsonl'));
    this.promptLogWriter = new PromptLogWriter(join(this.sessionDir, 'prompt-log.md'));
  }

  /**
   * The absolute path of the current session directory.
   * Returns `null` before {@link DiagnosticsCollector.init} has been called.
   */
  get currentSessionDir(): string | null {
    return this.sessionDir;
  }

  /**
   * Record an agent output event to `agent-output.jsonl`.
   *
   * This method is a no-op if the writer has not been initialized yet,
   * guarding against race conditions during startup.  Write errors are
   * silently discarded so that diagnostics never crash the orchestrator.
   *
   * @param event - The agent output event to persist.
   * @returns A promise that resolves once the record is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordAgentOutput(event: AgentOutputEvent): Promise<void> {
    if (!this.agentOutputWriter) return;
    try {
      await this.agentOutputWriter.append(event as unknown as Record<string, unknown>);
    } catch {
      // silently discard write errors
    }
  }

  /**
   * Record an orchestration event to `orchestration.jsonl`.
   *
   * This method is a no-op if the writer has not been initialized yet.
   * Write errors are silently discarded.
   *
   * @param event - The orchestration event to persist.
   * @returns A promise that resolves once the record is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordOrchestration(event: OrchestrationEvent): Promise<void> {
    if (!this.orchestrationWriter) return;
    try {
      await this.orchestrationWriter.append(event as unknown as Record<string, unknown>);
    } catch {
      // silently discard write errors
    }
  }

  /**
   * Record a performance event to `performance.jsonl`.
   *
   * This method is a no-op if the writer has not been initialized yet.
   * Write errors are silently discarded.
   *
   * @param event - The performance event to persist.
   * @returns A promise that resolves once the record is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordPerformance(event: PerformanceEvent): Promise<void> {
    if (!this.performanceWriter) return;
    try {
      await this.performanceWriter.append(event as unknown as Record<string, unknown>);
    } catch {
      // silently discard write errors
    }
  }

  /**
   * Record an error event to `errors.jsonl`.
   *
   * This method is a no-op if the writer has not been initialized yet.
   * Write errors are silently discarded.
   *
   * @param event - The error event to persist.
   * @returns A promise that resolves once the record is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordError(event: ErrorEvent): Promise<void> {
    if (!this.errorsWriter) return;
    try {
      await this.errorsWriter.append(event as unknown as Record<string, unknown>);
    } catch {
      // silently discard write errors
    }
  }

  /**
   * Record a hook run event to `hook-runs.jsonl`.
   *
   * This method is a no-op if the writer has not been initialized yet.
   * Write errors are silently discarded.
   *
   * @param event - The hook run event to persist.
   * @returns A promise that resolves once the record is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordHookRun(event: HookRunEvent): Promise<void> {
    if (!this.hookRunsWriter) return;
    try {
      await this.hookRunsWriter.append(event as unknown as Record<string, unknown>);
    } catch {
      // silently discard write errors
    }
  }

  /**
   * Record a full prompt to `prompt-log.md` with a markdown section header.
   *
   * This method is a no-op if the writer has not been initialized yet.
   * Write errors are silently discarded.
   *
   * @param hat - The hat (agent role) that produced this prompt.
   * @param iterationId - Unique identifier for the current iteration.
   * @param prompt - The full prompt text to record.
   * @returns A promise that resolves once the data is flushed (or immediately
   *   if the writer is not ready).
   */
  async recordPrompt(hat: string, iterationId: string, prompt: string): Promise<void> {
    if (!this.promptLogWriter) return;
    try {
      await this.promptLogWriter.append(hat, iterationId, prompt);
    } catch {
      // silently discard write errors
    }
  }
}
