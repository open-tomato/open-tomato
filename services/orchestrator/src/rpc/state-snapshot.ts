/**
 * @packageDocumentation
 * State snapshot capture for the RPC `get_state` command.
 *
 * Provides a {@link StateSnapshot} interface describing the shape of
 * a point-in-time orchestrator state, and a {@link captureStateSnapshot}
 * function that reads all relevant fields from the orchestrator context
 * in a single synchronous pass.
 *
 * The snapshot is a **pure read** — it copies values out of the context
 * without mutating any orchestrator state. Because the orchestration loop
 * is single-threaded (Node.js event loop), a synchronous read is
 * inherently atomic: no iteration can start or end between field reads
 * within the same microtask.
 *
 * @example
 * ```ts
 * import { captureStateSnapshot } from './state-snapshot.js';
 * import type { OrchestratorContext } from './state-snapshot.js';
 *
 * const snapshot = captureStateSnapshot(context);
 * // snapshot.iterationIndex, snapshot.hat, snapshot.taskCounts, etc.
 * ```
 */

import type { CostSnapshot, TaskCounts } from './types/index.js';

import { z } from 'zod';

import { costSnapshotSchema, hatIdSchema, taskCountsSchema } from './types/index.js';

// ---------------------------------------------------------------------------
// Orchestrator context (input interface)
// ---------------------------------------------------------------------------

/**
 * The subset of orchestrator state required to produce a {@link StateSnapshot}.
 *
 * Consumers provide an object satisfying this interface — typically the
 * orchestrator's internal context object — and {@link captureStateSnapshot}
 * reads from it without side effects.
 */
export interface OrchestratorContext {
  /** The current zero-based iteration index. */
  readonly iterationIndex: number;

  /** The identifier of the currently active hat, if any. */
  readonly hat: string | null;

  /** Aggregate task counts across all status categories. */
  readonly taskCounts: Readonly<TaskCounts>;

  /** Cumulative token and cost data for the active run. */
  readonly cost: Readonly<CostSnapshot>;

  /** The identifier of the task currently being executed, if any. */
  readonly activeTaskId: string | null;
}

// ---------------------------------------------------------------------------
// State snapshot schema and type
// ---------------------------------------------------------------------------

/**
 * Zod schema for a {@link StateSnapshot}.
 *
 * Used for validation in tests and for serialization guarantees when the
 * snapshot is published through the {@link RpcEventBus}.
 */
export const stateSnapshotSchema = z.object({
  /** Zero-based index of the current (or most recently completed) iteration. */
  iterationIndex: z.number().int()
    .nonnegative(),

  /** The active hat identifier, or `null` if no hat is set. */
  hat: hatIdSchema.nullable(),

  /** Aggregate task counts at the time of capture. */
  taskCounts: taskCountsSchema,

  /** Cumulative cost data at the time of capture. */
  cost: costSnapshotSchema,

  /** The identifier of the currently executing task, or `null` if idle. */
  activeTaskId: z.string().min(1)
    .nullable(),

  /** ISO-8601 timestamp of when the snapshot was captured. */
  capturedAt: z.string().datetime(),
});

/**
 * A point-in-time snapshot of the orchestrator's observable state.
 *
 * Returned by {@link captureStateSnapshot} and published as the payload
 * of an `orchestration_event` with `kind: 'state_snapshot'` in response
 * to a `get_state` command.
 */
export type StateSnapshot = z.infer<typeof stateSnapshotSchema>;

// ---------------------------------------------------------------------------
// Capture function
// ---------------------------------------------------------------------------

/**
 * Capture a read-only snapshot of the orchestrator's current state.
 *
 * This function performs a **pure read** — it copies every observable field
 * from the provided {@link OrchestratorContext} into a new plain object and
 * deep-freezes the result. The source context is never mutated.
 *
 * @remarks
 * ### Atomicity guarantee
 *
 * Because Node.js executes JavaScript on a single thread and this function
 * is **synchronous**, all field reads occur within the same microtask.
 * No iteration can start or end, and no event-loop turn can interleave,
 * between individual property accesses. This means the returned snapshot
 * is **atomically consistent** — every field reflects the same logical
 * instant in the orchestration loop.
 *
 * Callers that need a snapshot from inside an `async` handler should
 * invoke this function *before* the first `await` to preserve the
 * single-microtask guarantee.
 *
 * ### Immutability
 *
 * The returned object and its nested `taskCounts` and `cost` sub-objects
 * are frozen via {@link Object.freeze}. Attempts to mutate any property
 * will throw in strict mode.
 *
 * @param context - The orchestrator context to read from.
 * @returns A deeply frozen {@link StateSnapshot} reflecting the state at
 *   the instant of capture.
 *
 * @see {@link StateSnapshot} for the shape of the returned object.
 * @see {@link OrchestratorContext} for the input contract.
 * @see {@link stateSnapshotSchema} for runtime validation of snapshot payloads.
 */
export function captureStateSnapshot(
  context: OrchestratorContext,
): Readonly<StateSnapshot> {
  const taskCounts = Object.freeze({ ...context.taskCounts });
  const cost = Object.freeze({ ...context.cost });

  return Object.freeze({
    iterationIndex: context.iterationIndex,
    hat: context.hat,
    taskCounts,
    cost,
    activeTaskId: context.activeTaskId,
    capturedAt: new Date().toISOString(),
  });
}
