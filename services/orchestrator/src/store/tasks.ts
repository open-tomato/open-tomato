/**
 * @packageDocumentation
 * Data-access helpers for the tasks table.
 *
 * Tasks are now created directly by the executor loop runner (no longer via
 * notifications event side-effect). The UUID is generated locally by Postgres.
 */
import type { Db } from '../db/index.js';

import { and, asc, count, desc, eq } from 'drizzle-orm';

import { tasksTable } from '../db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateTaskParams {
  jobId: string;
  taskIndex: number;
  taskText: string;
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked';

export interface UpdateTaskParams {
  status?: TaskStatus;
  completedAt?: Date;
  durationMs?: number;
  exitCode?: number;
}

export interface BulkCreateTaskInput {
  index: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inserts a new task row for a job.
 *
 * Called directly by the loop runner when a task starts. The returned row's
 * `id` is included in subsequent task events emitted to notifications.
 *
 * @param db - Drizzle database instance.
 * @param params - Task creation parameters.
 * @returns The inserted task row.
 */
export async function createTask(db: Db, params: CreateTaskParams) {
  const rows = await db
    .insert(tasksTable)
    .values({
      job_id: params.jobId,
      task_index: params.taskIndex,
      task_text: params.taskText,
      status: 'running',
    })
    .returning();

  // INSERT always returns a row; cast is safe here.
  return rows[0] as typeof tasksTable.$inferSelect;
}

/**
 * Updates a task row with the result of its execution.
 *
 * @param db - Drizzle database instance.
 * @param taskId - The task UUID to update.
 * @param patch - Fields to set on the row.
 */
export async function updateTask(db: Db, taskId: string, patch: UpdateTaskParams) {
  await db
    .update(tasksTable)
    .set({
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.completedAt !== undefined && { completed_at: patch.completedAt }),
      ...(patch.durationMs !== undefined && { duration_ms: patch.durationMs }),
      ...(patch.exitCode !== undefined && { exit_code: patch.exitCode }),
    })
    .where(eq(tasksTable.id, taskId));
}

/**
 * Returns the current (most recently started, still running) task for a job.
 *
 * Returns `null` when no running task exists — which is the case for
 * completed, failed, or idle jobs.
 *
 * Unlike the notifications version, this does not join with events (events
 * stay in notifications).
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @returns The current task, or `null`.
 */
export async function getCurrentTask(
  db: Db,
  jobId: string,
): Promise<typeof tasksTable.$inferSelect | null> {
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.job_id, jobId), eq(tasksTable.status, 'running')))
    .orderBy(desc(tasksTable.started_at))
    .limit(1);

  return task ?? null;
}

// ---------------------------------------------------------------------------
// DB-driven task iteration helpers
// ---------------------------------------------------------------------------

/**
 * Inserts all tasks for a job as `'pending'` rows in a single batch.
 *
 * Called at job creation time — either from the pre-parsed plan payload
 * (schedulus dispatch) or after parsing PLAN.md from disk (branch dispatch).
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @param tasks - Ordered task inputs (index + text).
 * @returns The inserted task rows.
 */
export async function bulkCreateTasks(
  db: Db,
  jobId: string,
  tasks: ReadonlyArray<BulkCreateTaskInput>,
): Promise<Array<typeof tasksTable.$inferSelect>> {
  if (tasks.length === 0) return [];

  const rows = await db
    .insert(tasksTable)
    .values(
      tasks.map((t) => ({
        job_id: jobId,
        task_index: t.index,
        task_text: t.text,
        status: 'pending' as const,
      })),
    )
    .returning();

  return rows;
}

/**
 * Returns the next actionable task for a job from the database.
 *
 * Blocked tasks are preferred over pending ones (resume interrupted work
 * before starting new tasks), matching the file-based `findNextTask` semantics.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @returns The next task to run, or `null` when all tasks are done.
 */
export async function findNextPendingTask(
  db: Db,
  jobId: string,
): Promise<typeof tasksTable.$inferSelect | null> {
  // Prefer blocked tasks first (resume interrupted work)
  const [blocked] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.job_id, jobId), eq(tasksTable.status, 'blocked')))
    .orderBy(asc(tasksTable.task_index))
    .limit(1);

  if (blocked) return blocked;

  // Otherwise, find the next pending task
  const [pending] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.job_id, jobId), eq(tasksTable.status, 'pending')))
    .orderBy(asc(tasksTable.task_index))
    .limit(1);

  return pending ?? null;
}

/**
 * Updates a task's status with optional completion metadata.
 *
 * @param db - Drizzle database instance.
 * @param taskId - The task UUID to update.
 * @param status - New task status.
 * @param meta - Optional completion fields (timestamp, duration, exit code).
 */
export async function updateTaskStatus(
  db: Db,
  taskId: string,
  status: TaskStatus,
  meta?: { completedAt?: Date; durationMs?: number; exitCode?: number },
): Promise<void> {
  await db
    .update(tasksTable)
    .set({
      status,
      ...(meta?.completedAt !== undefined && { completed_at: meta.completedAt }),
      ...(meta?.durationMs !== undefined && { duration_ms: meta.durationMs }),
      ...(meta?.exitCode !== undefined && { exit_code: meta.exitCode }),
    })
    .where(eq(tasksTable.id, taskId));
}

/**
 * Counts total tasks for a job.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @returns Total number of task rows for this job.
 */
export async function countJobTasks(
  db: Db,
  jobId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(tasksTable)
    .where(eq(tasksTable.job_id, jobId));

  return result?.value ?? 0;
}

/**
 * Returns all tasks for a job, ordered by task_index.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @returns All task rows for this job.
 */
export async function listJobTasks(
  db: Db,
  jobId: string,
): Promise<Array<typeof tasksTable.$inferSelect>> {
  return db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.job_id, jobId))
    .orderBy(asc(tasksTable.task_index));
}
