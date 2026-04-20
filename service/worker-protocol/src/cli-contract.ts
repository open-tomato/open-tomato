/**
 * CLI argument contract for the task-worker CLI entry point.
 *
 * Defines the subcommands and their argument shapes so that the executor's
 * `TaskWorkerCliClient` can build correct invocations and the CLI entry
 * point can validate inputs consistently.
 */

// ---------------------------------------------------------------------------
// Subcommand argument shapes
// ---------------------------------------------------------------------------

/** Arguments for `cli.ts exec`. */
export interface CliExecArgs {
  readonly prompt: string;
  readonly workDir: string;
  readonly model?: string;
  readonly providerUrl?: string;
}

/** Arguments for `cli.ts workspace-prepare`. */
export interface CliWorkspacePrepareArgs {
  readonly branch: string;
  readonly dir: string;
  readonly repoUrl?: string;
}

/** Arguments for `cli.ts workspace-clean`. */
export interface CliWorkspaceCleanArgs {
  readonly dir: string;
}

/** Arguments for `cli.ts instinct-flush`. */
export interface CliInstinctFlushArgs {
  readonly dir?: string;
  readonly orchestratorUrl?: string;
}

// ---------------------------------------------------------------------------
// Exit code conventions
// ---------------------------------------------------------------------------

/**
 * Exit codes used by the task-worker CLI.
 *
 * Codes 0-127 are reserved for the Claude Code CLI's own exit codes
 * (passed through transparently from `exec`). Codes 200+ are
 * task-worker-specific.
 */
export const CLI_EXIT_CODES = {
  /** Successful execution. */
  SUCCESS: 0,
  /** Invalid arguments or unknown subcommand. */
  INVALID_ARGS: 200,
  /** Model preset not found in approved registry. */
  UNKNOWN_MODEL: 201,
  /** Workspace preparation failed (git clone error). */
  WORKSPACE_FAILED: 202,
  /** Instinct flush failed (orchestrator unreachable). */
  INSTINCT_FLUSH_FAILED: 203,
} as const;

export type CliExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

// ---------------------------------------------------------------------------
// CLI binary path helper
// ---------------------------------------------------------------------------

/**
 * Builds the command array to invoke the task-worker CLI.
 *
 * @param cliPath - Absolute path to the `cli.ts` entry point.
 * @param subcommand - The CLI subcommand to run.
 * @param args - Key-value pairs converted to `--key value` flags.
 */
export function buildCliCommand(
  cliPath: string,
  subcommand: string,
  args: Record<string, string | undefined>,
): string[] {
  const cmd = ['bun', cliPath, subcommand];
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      cmd.push(`--${key}`, value);
    }
  }
  return cmd;
}
