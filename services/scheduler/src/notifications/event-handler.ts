/**
 * @packageDocumentation
 * Handles incoming executor events from the notification SSE stream.
 * Updates plan/task status in the schedulus DB to mirror executor state.
 */

import type { Db } from '../db/index.js';
import type { JobEvent, Subscription } from './subscriber.js';

import { createLog } from '../store/logs.js';
import { updatePlan } from '../store/plans.js';
import { subscribeToJob } from './subscriber.js';

// ---------------------------------------------------------------------------
// Active subscriptions (keyed by schedulus plan ID)
// ---------------------------------------------------------------------------

const activeSubscriptions = new Map<string, Subscription>();

/**
 * Subscribes to executor job events for a plan and mirrors status
 * changes back to the schedulus DB.
 */
export function subscribeToPlanEvents(
  db: Db,
  planId: string,
  executorJobId: string,
  notificationUrl: string | undefined,
): void {
  // Clean up existing subscription if any
  const existing = activeSubscriptions.get(planId);
  if (existing) {
    existing.close();
  }

  const sub = subscribeToJob(notificationUrl, executorJobId, (event) => {
    handlePlanEvent(db, planId, event).catch((err: unknown) => {
      console.error(`[schedulus] event handler error for plan ${planId}:`, err);
    });
  });

  activeSubscriptions.set(planId, sub);
}

/**
 * Cleans up the SSE subscription for a plan.
 */
export function unsubscribeFromPlan(planId: string): void {
  const sub = activeSubscriptions.get(planId);
  if (sub) {
    sub.close();
    activeSubscriptions.delete(planId);
  }
}

/**
 * Returns the set of plan IDs with active subscriptions.
 */
export function getActiveSubscriptionIds(): string[] {
  return [...activeSubscriptions.keys()];
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

async function handlePlanEvent(
  db: Db,
  planId: string,
  event: JobEvent,
): Promise<void> {
  // Log every relevant event
  await createLog(db, {
    plan_id: planId,
    event_type: event.type,
    metadata: event.data,
  });

  switch (event.type) {
    case 'loop.done':
      await updatePlan(db, planId, { status: 'completed' });
      unsubscribeFromPlan(planId);
      break;

    case 'loop.cancelled': {
      const reason = event.data['reason'] as string | undefined;
      const isFailed = reason?.includes('failed') || reason?.includes('exit code');
      await updatePlan(db, planId, { status: isFailed ? 'failed' : 'cancelled' });
      unsubscribeFromPlan(planId);
      break;
    }

    case 'task.started':
      await updatePlan(db, planId, { status: 'running' });
      break;

    case 'task.done':
    case 'task.failed':
      // Status stays 'running' — individual task events are logged but don't
      // change the plan status. The loop.done/loop.cancelled events handle that.
      break;

    case 'prerequisite.check': {
      // Logged above — no plan status change needed for schedulus.
      // The executor handles prerequisite gating internally.
      break;
    }
  }
}
