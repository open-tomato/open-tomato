/**
 * Per-backend command and environment configuration.
 *
 * Each backend (Claude, Gemini, Codex, or a custom operator-supplied CLI)
 * is described by a single `BackendDescriptor` that tells the fallback
 * chain how to spawn, feed a prompt to, and interpret output from the
 * underlying process.
 */

/** How the backend emits its response. */
export type OutputFormat = 'text' | 'stream-json' | 'pi-stream-json' | 'acp';

/** How the prompt is delivered to the backend process. */
export type PromptMode = 'flag' | 'stdin' | 'positional';

export interface BackendDescriptor {
  /** Human-readable identifier (e.g. 'claude', 'gemini', 'codex'). */
  readonly name: string;

  /** Executable command to spawn (resolved via PATH). */
  readonly command: string;

  /** Static arguments passed on every invocation. */
  readonly args: readonly string[];

  /** How the prompt is delivered to the spawned process. */
  readonly promptMode: PromptMode;

  /** Expected output format — drives parser selection. */
  readonly outputFormat: OutputFormat;

  /** Extra environment variables merged into the subprocess env. */
  readonly envVars: Readonly<Record<string, string>>;
}
