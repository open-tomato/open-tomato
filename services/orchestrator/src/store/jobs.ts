/**
 * @packageDocumentation
 * Data-access helpers for the jobs table.
 *
 * Adapted from `services/notifications/src/store/nodes.ts` (job section).
 * The executor now owns job state directly instead of relying on
 * notifications event side-effects.
 */
import type { Db } from '../db/index.js';
import type { NewJob } from '../db/schema.js';

import { desc, eq, inArray } from 'drizzle-orm';

import { jobsTable } from '../db/schema.js';

/**
 * Inserts a new job row.
 *
 * @param db - Drizzle database instance.
 * @param job - Job fields to insert.
 * @returns The inserted job row.
 */
export async function createJob(db: Db, job: NewJob) {
  const [row] = await db.insert(jobsTable).values(job)
    .returning();
  return row;
}

/**
 * Looks up a single job by its UUID.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID.
 * @returns The job row, or `null` if not found.
 */
export async function getJob(db: Db, jobId: string) {
  const [row] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));

  return row ?? null;
}

/**
 * Returns jobs filtered by status, ordered newest-first.
 *
 * @param db - Drizzle database instance.
 * @param opts - Optional filter; if `statuses` is omitted, all jobs are returned.
 * @returns Array of job rows (max 100).
 */
export async function listJobs(db: Db, opts?: { statuses?: string[] }) {
  const query = db.select().from(jobsTable);

  if (opts?.statuses?.length) {
    const statusFilter = opts.statuses as Array<
      'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'blocked'
    >;
    return query
      .where(inArray(jobsTable.status, statusFilter))
      .orderBy(desc(jobsTable.created_at))
      .limit(100);
  }

  return query.orderBy(desc(jobsTable.created_at)).limit(100);
}

/**
 * Stores the discriminated task counts that arrive with the `loop.started` event.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID to update.
 * @param planTasksCount - Number of tasks in PLAN.md.
 * @param prereqTasksCount - Number of tasks in PREREQUISITES.md.
 */
export async function updateJobTaskCounts(
  db: Db,
  jobId: string,
  planTasksCount: number,
  prereqTasksCount: number,
) {
  await db
    .update(jobsTable)
    .set({ plan_tasks_count: planTasksCount, prereq_tasks_count: prereqTasksCount })
    .where(eq(jobsTable.id, jobId));
}

/**
 * Updates the lifecycle status of a job.
 *
 * @param db - Drizzle database instance.
 * @param jobId - The job UUID to update.
 * @param status - New lifecycle status.
 * @param extra - Optional timestamps to set alongside the status.
 */
export async function updateJobStatus(
  db: Db,
  jobId: string,
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'blocked',
  extra?: { started_at?: Date; completed_at?: Date },
) {
  await db
    .update(jobsTable)
    .set({ status, ...extra })
    .where(eq(jobsTable.id, jobId));
}

/**
 * Returns all jobs in `running` or `paused` state.
 *
 * Used on executor startup to detect jobs that were interrupted by a restart
 * and need to be transitioned to `blocked`.
 *
 * @param db - Drizzle database instance.
 * @returns Array of active job rows.
 */
export async function findActiveJobs(db: Db) {
  return db
    .select()
    .from(jobsTable)
    .where(inArray(jobsTable.status, ['running', 'paused']));
}
