/**
 * @packageDocumentation
 * Roadmap runner — dispatches plans sequentially according to execution_order.
 *
 * After dispatching each plan, the runner subscribes to notification events
 * and waits for completion before dispatching the next plan. If a plan fails,
 * the roadmap is marked as failed and remaining plans are skipped.
 */

import type { Db } from '../db/index.js';
import type { ExecutorClient } from '../executor/client.js';

import { subscribeToPlanEvents } from '../notifications/event-handler.js';
import { createLog } from '../store/logs.js';
import { getPlan, updatePlan } from '../store/plans.js';
import {
  findNextPendingRoadmapPlan,
  listRoadmapPlans,
  updateRoadmap,
  updateRoadmapPlanStatus,
} from '../store/roadmaps.js';
import { listPlanTasks } from '../store/tasks.js';

// ---------------------------------------------------------------------------
// Active roadmap runs (keyed by roadmap ID)
// ---------------------------------------------------------------------------

const activeRuns = new Map<string, { cancelled: boolean }>();

/**
 * Returns true if the roadmap is currently being executed.
 */
export function isRoadmapRunning(roadmapId: string): boolean {
  return activeRuns.has(roadmapId);
}

/**
 * Cancels a running roadmap. The current plan finishes but no further
 * plans are dispatched.
 */
export function cancelRoadmapRun(roadmapId: string): void {
  const run = activeRuns.get(roadmapId);
  if (run) {
    run.cancelled = true;
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Executes a roadmap by dispatching its plans sequentially.
 *
 * This function is fire-and-forget — it runs in the background and
 * updates roadmap/plan status as it progresses.
 */
export async function executeRoadmap(
  db: Db,
  roadmapId: string,
  executor: ExecutorClient,
  notificationUrl: string | undefined,
): Promise<void> {
  const runState = { cancelled: false };
  activeRuns.set(roadmapId, runState);

  try {
    await updateRoadmap(db, roadmapId, { status: 'running' });

    await createLog(db, {
      roadmap_id: roadmapId,
      event_type: 'roadmap.started',
      status_message: 'Roadmap execution started',
    });

    while (!runState.cancelled) {
      const nextEntry = await findNextPendingRoadmapPlan(db, roadmapId);
      if (!nextEntry) {
        // All plans processed
        break;
      }

      const plan = await getPlan(db, nextEntry.plan_id);
      if (!plan) {
        await updateRoadmapPlanStatus(db, nextEntry.id, 'failed');
        await createLog(db, {
          roadmap_id: roadmapId,
          plan_id: nextEntry.plan_id,
          event_type: 'roadmap.plan_skipped',
          status_message: 'Plan not found',
        });
        continue;
      }

      // Skip plans that can't be executed
      if (plan.status === 'completed') {
        await updateRoadmapPlanStatus(db, nextEntry.id, 'completed');
        continue;
      }

      if (plan.status === 'deleted') {
        await updateRoadmapPlanStatus(db, nextEntry.id, 'skipped');
        continue;
      }

      const tasks = await listPlanTasks(db, plan.id);
      if (tasks.length === 0) {
        await updateRoadmapPlanStatus(db, nextEntry.id, 'skipped');
        await createLog(db, {
          roadmap_id: roadmapId,
          plan_id: plan.id,
          event_type: 'roadmap.plan_skipped',
          status_message: 'Plan has no tasks',
        });
        continue;
      }

      // Dispatch the plan
      await updateRoadmapPlanStatus(db, nextEntry.id, 'running');

      try {
        const result = await executor.dispatch(plan.id, {
          name: plan.name,
          description: plan.description ?? undefined,
          tasks: tasks.map((t) => ({ index: t.task_index, text: t.task_text })),
        });

        await updatePlan(db, plan.id, {
          executor_job_id: result.jobId,
          status: 'dispatched',
        });

        await createLog(db, {
          roadmap_id: roadmapId,
          plan_id: plan.id,
          event_type: 'roadmap.plan_dispatched',
          status_message: `Dispatched as executor job ${result.jobId}`,
          metadata: { executor_job_id: result.jobId },
        });

        // Subscribe to events and wait for completion
        subscribeToPlanEvents(db, plan.id, result.jobId, notificationUrl);
        await waitForPlanCompletion(db, plan.id);

        // Check final status
        const finalPlan = await getPlan(db, plan.id);
        const finalStatus = finalPlan?.status ?? 'failed';

        if (finalStatus === 'completed') {
          await updateRoadmapPlanStatus(db, nextEntry.id, 'completed');
        } else {
          await updateRoadmapPlanStatus(db, nextEntry.id, 'failed');

          // Stop the roadmap on plan failure
          await updateRoadmap(db, roadmapId, { status: 'failed' });
          await createLog(db, {
            roadmap_id: roadmapId,
            plan_id: plan.id,
            event_type: 'roadmap.failed',
            status_message: `Stopped: plan ${plan.name} ended with status '${finalStatus}'`,
          });

          // Mark remaining plans as skipped
          await skipRemainingPlans(db, roadmapId);
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await updateRoadmapPlanStatus(db, nextEntry.id, 'failed');
        await updatePlan(db, plan.id, { status: 'failed' });
        await updateRoadmap(db, roadmapId, { status: 'failed' });
        await createLog(db, {
          roadmap_id: roadmapId,
          plan_id: plan.id,
          event_type: 'roadmap.failed',
          status_message: `Dispatch error: ${message}`,
        });
        await skipRemainingPlans(db, roadmapId);
        return;
      }
    }

    if (runState.cancelled) {
      await updateRoadmap(db, roadmapId, { status: 'cancelled' });
      await createLog(db, {
        roadmap_id: roadmapId,
        event_type: 'roadmap.cancelled',
        status_message: 'Roadmap cancelled by operator',
      });
      await skipRemainingPlans(db, roadmapId);
    } else {
      await updateRoadmap(db, roadmapId, { status: 'completed' });
      await createLog(db, {
        roadmap_id: roadmapId,
        event_type: 'roadmap.completed',
        status_message: 'All plans completed successfully',
      });
    }
  } finally {
    activeRuns.delete(roadmapId);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Polls plan status until it reaches a terminal state.
 * Checks every 3 seconds.
 */
async function waitForPlanCompletion(db: Db, planId: string): Promise<void> {
  const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'blocked']);

  while (true) {
    const plan = await getPlan(db, planId);
    if (!plan || terminalStatuses.has(plan.status)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
}

/**
 * Marks all remaining 'pending' roadmap-plan entries as 'skipped'.
 */
async function skipRemainingPlans(db: Db, roadmapId: string): Promise<void> {
  const entries = await listRoadmapPlans(db, roadmapId);
  for (const entry of entries) {
    if (entry.status === 'pending') {
      await updateRoadmapPlanStatus(db, entry.id, 'skipped');
    }
  }
}
