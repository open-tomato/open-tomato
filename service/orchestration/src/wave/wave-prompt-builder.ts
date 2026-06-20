/**
 * Options for building a focused worker prompt.
 *
 * Each field maps to a section of the final prompt string that a wave
 * worker receives. The prompt is intentionally minimal — it contains
 * only the information the worker needs to execute its task and publish
 * its result, with no session history or full orchestrator context.
 */
export interface WorkerPromptOptions {
  /** Raw hat instruction text injected verbatim at the top of the prompt. */
  hat_instructions: string;

  /** Zero-based index of this worker within the wave. */
  worker_index: number;

  /** Total number of workers in the wave. */
  worker_total: number;

  /** Serialised task payload describing the worker's assignment. */
  payload: string;

  /** Shell command the worker must run to publish its result. */
  publish_command: string;
}

/**
 * Builds focused, deterministic prompts for individual wave workers.
 *
 * Each prompt contains only the hat instructions, a worker identity line,
 * the task payload, the publish command, and a constraint forbidding
 * nested wave operations. No session history or full context is included.
 */
export class WavePromptBuilder {
  /**
   * Construct a focused prompt string for a single wave worker.
   *
   * The output is deterministic — identical inputs always produce
   * identical output. The prompt sections are joined with newlines in
   * a fixed order:
   *
   * 1. Hat instructions (verbatim)
   * 2. Worker identity line (`You are worker X of Y.`)
   * 3. Task payload (`Your task: ...`)
   * 4. Publish command (`When complete, run: ...`)
   * 5. Nested-wave constraint (`Do not spawn nested wave operations.`)
   *
   * @param opts - The prompt components for this worker.
   * @returns The assembled prompt string.
   */
  buildWorkerPrompt(opts: Readonly<WorkerPromptOptions>): string {
    return [
      opts.hat_instructions,
      `You are worker ${opts.worker_index + 1} of ${opts.worker_total}.`,
      `Your task: ${opts.payload}`,
      `When complete, run: ${opts.publish_command}`,
      'Do not spawn nested wave operations.',
    ].join('\n');
  }
}
