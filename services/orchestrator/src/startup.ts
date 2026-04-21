/**
 * @packageDocumentation
 * Executor startup recovery logic.
 *
 * On startup, any jobs left in `running` or `paused` state (from a prior
 * crash or restart) are transitioned to `blocked` since the executor cannot
 * safely resume them without knowing the worker's state.
 */

import type { Db } from './db/index.js';
import type { NotificationClient } from './notifications/client.js';

import { findActiveJobs, updateJobStatus } from './store/jobs.js';

/**
 * Scans for jobs that were interrupted by an executor restart and transitions
 * them to `blocked`. Emits a `loop.cancelled` event to notifications for each.
 *
 * @param db - Drizzle database instance.
 * @param notify - Notification client for emitting cancellation events.
 * @param nodeId - This executor's node identifier.
 */
export async function recoverInterruptedJobs(
  db: Db,
  notify: NotificationClient,
  nodeId: string,
): Promise<void> {
  const activeJobs = await findActiveJobs(db);

  for (const job of activeJobs) {
    await updateJobStatus(db, job.id, 'blocked', { completed_at: new Date() });
    await notify.emitEvent(job.id, nodeId, {
      type: 'loop.cancelled',
      reason: 'executor restarted — job interrupted',
    });
    console.log(`[executor] recovered interrupted job ${job.id} → blocked`);
  }

  if (activeJobs.length > 0) {
    console.log(`[executor] recovered ${activeJobs.length} interrupted job(s)`);
  }
}
