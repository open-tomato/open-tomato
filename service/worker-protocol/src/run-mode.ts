/**
 * Run mode types for the executor's worker management strategy.
 *
 * The executor selects a run mode that determines how task-workers are
 * created, communicated with, and torn down.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * How the executor manages task-workers.
 *
 * - `local`  — Spawns `bun cli.ts exec ...` as a subprocess per task.
 * - `docker` — Communicates via HTTP with containerized task-workers.
 *              Can spawn/destroy containers via Docker API.
 * - `remote` — Communicates via HTTP with pre-existing task-workers.
 *              No lifecycle management (workers self-register).
 * - `serverless` — Future: invoke a lambda function per task.
 */
export type RunMode = 'local' | 'docker' | 'remote' | 'serverless';

export const RunModeSchema = z.enum(['local', 'docker', 'remote', 'serverless']);

export interface RunModeConfig {
  /** Active run mode. */
  readonly mode: RunMode;
  /** Default model preset name for new workers. */
  readonly defaultModel: string;
  /** Maximum concurrent workers (local and docker modes). */
  readonly maxWorkers?: number;
  /** Docker image for task-worker containers (docker mode only). */
  readonly dockerImage?: string;
  /** Custom provider URL passed to all workers (e.g. Ollama endpoint). */
  readonly providerUrl?: string;
}

export const RunModeConfigSchema: z.ZodType<RunModeConfig> = z.object({
  mode: RunModeSchema,
  defaultModel: z.string().min(1),
  maxWorkers: z.number().int()
    .positive()
    .optional(),
  dockerImage: z.string().min(1)
    .optional(),
  providerUrl: z.string().url()
    .optional(),
});
