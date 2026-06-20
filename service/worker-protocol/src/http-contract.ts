/**
 * HTTP API contract for the task-worker service.
 *
 * Zod schemas define the wire protocol between the executor's
 * `TaskWorkerHttpClient` and the task-worker's Express routes.
 * Both sides import from this module to stay in sync.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /exec
// ---------------------------------------------------------------------------

export const ExecRequestSchema = z.object({
  /** The prompt to send to the Claude Code CLI. */
  prompt: z.string().min(1),
  /** Absolute path to the workspace directory inside the worker. */
  workDir: z.string().min(1),
  /** Model preset name (resolved from the approved registry). */
  model: z.string().optional(),
  /** Override provider URL for custom model providers. */
  providerUrl: z.string().url()
    .optional(),
});

export type ExecRequest = z.infer<typeof ExecRequestSchema>;

// ---------------------------------------------------------------------------
// POST /workspace
// ---------------------------------------------------------------------------

export const WorkspaceRequestSchema = z.object({
  /** Git branch to check out. */
  branch: z.string().min(1),
  /** Remote repository URL. If omitted, clones from the local repo path. */
  repoUrl: z.string().optional(),
});

export type WorkspaceRequest = z.infer<typeof WorkspaceRequestSchema>;

export const WorkspaceResponseSchema = z.object({
  /** Absolute path to the prepared workspace directory. */
  workDir: z.string().min(1),
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

// ---------------------------------------------------------------------------
// DELETE /workspace
// ---------------------------------------------------------------------------

export const WorkspaceCleanResponseSchema = z.object({
  /** Whether cleanup succeeded. */
  cleaned: z.boolean(),
});

export type WorkspaceCleanResponse = z.infer<typeof WorkspaceCleanResponseSchema>;

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  /** Current worker status. */
  status: z.enum(['idle', 'busy']),
  /** Worker identifier. */
  workerId: z.string(),
  /** Model preset names this worker can run. */
  supportedModels: z.array(z.string()),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
