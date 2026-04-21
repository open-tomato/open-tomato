/**
 * @packageDocumentation
 * Shared sub-types reused across RPC commands and events.
 *
 * These Zod schemas and inferred types represent common building blocks
 * (enums, sub-objects) that appear in multiple command params or event data
 * payloads. Centralising them here avoids duplication and ensures a single
 * source of truth for discriminant values and structural shapes.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Hat
// ---------------------------------------------------------------------------

/**
 * Schema for a hat identifier string.
 *
 * Hats are agent personas defined in the topology. This schema matches the
 * `id` field of a {@link HatDefinition} from `@open-tomato/types`.
 */
export const hatIdSchema = z.string().min(1);

/** A hat identifier string. */
export type HatId = z.infer<typeof hatIdSchema>;

// ---------------------------------------------------------------------------
// Guidance scope
// ---------------------------------------------------------------------------

/**
 * Schema for the scope of an injected guidance directive.
 *
 * - `current_iteration` — applies only to the iteration in progress.
 * - `remaining` — persists for all subsequent iterations.
 */
export const guidanceAppliesToSchema = z.enum([
  'current_iteration',
  'remaining',
]);

/** Scope of an injected guidance directive. */
export type GuidanceAppliesTo = z.infer<typeof guidanceAppliesToSchema>;

// ---------------------------------------------------------------------------
// Guidance command type (for acknowledgments)
// ---------------------------------------------------------------------------

/**
 * Schema for the type of command being acknowledged in a `guidance_ack` event.
 */
export const guidanceCommandTypeSchema = z.enum(['guidance', 'steer']);

/** The type of command acknowledged by a `guidance_ack` event. */
export type GuidanceCommandType = z.infer<typeof guidanceCommandTypeSchema>;

// ---------------------------------------------------------------------------
// Loop termination reason
// ---------------------------------------------------------------------------

/**
 * Schema for the reason a loop terminated.
 *
 * - `completed` — the orchestrator finished all planned work.
 * - `aborted` — an external `abort` command was received.
 * - `max_iterations` — the configured iteration cap was reached.
 * - `error` — an unrecoverable error halted the loop.
 */
export const loopTerminationReasonSchema = z.enum([
  'completed',
  'aborted',
  'max_iterations',
  'error',
]);

/** Reason a loop terminated. */
export type LoopTerminationReason = z.infer<typeof loopTerminationReasonSchema>;

// ---------------------------------------------------------------------------
// Task status
// ---------------------------------------------------------------------------

/**
 * Schema for valid task status values.
 *
 * Tasks transition through these statuses during orchestration.
 */
export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

/** A task status value. */
export type TaskStatus = z.infer<typeof taskStatusSchema>;

// ---------------------------------------------------------------------------
// Task counts
// ---------------------------------------------------------------------------

/**
 * Schema for aggregate task counts across all status categories.
 *
 * Used in both the `task_counts_updated` event and state snapshots.
 */
export const taskCountsSchema = z.object({
  /** Number of pending tasks. */
  pending: z.number().int()
    .nonnegative(),
  /** Number of in-progress tasks. */
  inProgress: z.number().int()
    .nonnegative(),
  /** Number of completed tasks. */
  completed: z.number().int()
    .nonnegative(),
  /** Number of failed tasks. */
  failed: z.number().int()
    .nonnegative(),
});

/** Aggregate task counts. */
export type TaskCounts = z.infer<typeof taskCountsSchema>;

// ---------------------------------------------------------------------------
// Iteration meta
// ---------------------------------------------------------------------------

/**
 * Schema for the common iteration index field.
 *
 * Many event payloads include a zero-based iteration index to correlate
 * the event with a specific orchestration iteration.
 */
export const iterationIndexSchema = z.number().int()
  .nonnegative();

/** A zero-based iteration index. */
export type IterationIndex = z.infer<typeof iterationIndexSchema>;

/**
 * Schema for iteration metadata returned by `get_iterations` or embedded
 * in state snapshots.
 */
export const iterationMetaSchema = z.object({
  /** Zero-based iteration index. */
  index: iterationIndexSchema,
  /** ISO-8601 timestamp when the iteration started. */
  startedAt: z.string().datetime(),
  /** ISO-8601 timestamp when the iteration ended, if finished. */
  endedAt: z.string().datetime()
    .optional(),
  /** Duration in milliseconds, if the iteration has ended. */
  durationMs: z.number().nonnegative()
    .optional(),
  /** Number of tokens consumed during this iteration. */
  tokensUsed: z.number().int()
    .nonnegative()
    .optional(),
});

/** Metadata for a single orchestration iteration. */
export type IterationMeta = z.infer<typeof iterationMetaSchema>;

// ---------------------------------------------------------------------------
// Cost snapshot
// ---------------------------------------------------------------------------

/**
 * Schema for a point-in-time cost snapshot.
 *
 * Captured during state snapshots to provide callers with cumulative
 * token and cost data for the active orchestration run.
 */
export const costSnapshotSchema = z.object({
  /** Total input tokens consumed so far. */
  inputTokens: z.number().int()
    .nonnegative(),
  /** Total output tokens consumed so far. */
  outputTokens: z.number().int()
    .nonnegative(),
  /** Estimated cost in USD (informational, not billing-grade). */
  estimatedCostUsd: z.number().nonnegative()
    .optional(),
});

/** A point-in-time cost snapshot. */
export type CostSnapshot = z.infer<typeof costSnapshotSchema>;

// ---------------------------------------------------------------------------
// ISO timestamp helper
// ---------------------------------------------------------------------------

/**
 * Schema for an ISO-8601 datetime string.
 *
 * Re-exported here so command and event schemas can reference a single
 * definition rather than repeating `z.string().datetime()`.
 */
export const timestampSchema = z.string().datetime();

/** An ISO-8601 datetime string. */
export type Timestamp = z.infer<typeof timestampSchema>;
