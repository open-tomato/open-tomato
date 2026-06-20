/**
 * @module loop-termination
 *
 * Provides {@link validateLoopComplete} — a guard function that decides whether
 * a `LOOP_COMPLETE` signal should be accepted for a given loop.
 *
 * Loop termination flowchart (see Linear issue OPT-211):
 * ```
 * LOOP_COMPLETE signal received
 *        │
 *        ▼
 * hasPendingTasks(loopId)?
 *   ┌── yes ──► accepted: false  (reason: pending tasks remain)
 *   │
 *   └── no  ──► accepted: true   (all tasks are Closed or Failed)
 * ```
 *
 * @see {@link https://linear.app/bifemecanico/issue/OPT-211 | OPT-211: Task System — JSONL-Based Work Tracking with Blocking Dependencies}
 */

import type { TaskStore } from './task-store';

/**
 * Validates whether a `LOOP_COMPLETE` signal should be accepted for the given
 * loop.
 *
 * A loop may only be accepted as complete when **no tasks remain in `Open` or
 * `InProgress` status** for that loop. Tasks in `Closed` or `Failed` terminal
 * states are ignored — a loop with only failed tasks is still considered
 * complete from a scheduling perspective.
 *
 * @param loopId - The loop identifier to evaluate.
 * @param store  - The {@link TaskStore} instance to query.
 * @returns An object with:
 *   - `accepted: true` when the loop has no pending tasks.
 *   - `accepted: false` and a descriptive `reason` when pending tasks remain.
 *
 * @example
 * ```typescript
 * const result = await validateLoopComplete('loop-001', store);
 * if (!result.accepted) {
 *   console.log('Loop not done:', result.reason);
 * }
 * ```
 */
export async function validateLoopComplete(
  loopId: string,
  store: TaskStore,
): Promise<{ accepted: boolean; reason?: string }> {
  const hasPending = await store.hasPendingTasks(loopId);

  if (hasPending) {
    return {
      accepted: false,
      reason: `Loop "${loopId}" has pending tasks that are not yet Closed or Failed.`,
    };
  }

  return { accepted: true };
}
