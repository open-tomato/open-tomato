/**
 * @packageDocumentation
 * Data-access helpers for the append-only events table.
 */
import type { Db } from '../db/index.js';
import type { EntityKind } from '../entity/types.js';

import { desc, eq } from 'drizzle-orm';

import { eventsTable } from '../db/schema.js';

export interface StoreEventParams {
  jobId: string;
  entityKind: EntityKind;
  eventType: string;
  payload: unknown;
}

/**
 * Appends an event to the persistent store.
 *
 * @param db - Drizzle database instance.
 * @param params - Event envelope and payload.
 * @returns The inserted event row.
 */
export async function storeEvent(db: Db, params: StoreEventParams) {
  const [row] = await db
    .insert(eventsTable)
    .values({
      job_id: params.jobId,
      entity_kind: params.entityKind,
      event_type: params.eventType,
      payload: params.payload as Record<string, unknown>,
    })
    .returning();

  return row;
}

/**
 * Fetches all events for a job, ordered oldest-first.
 * Used to replay history to new SSE subscribers.
 *
 * @param db - Drizzle database instance.
 * @param jobId - UUID of the job whose events to fetch.
 * @returns Array of event rows in chronological order.
 */
export async function getEventHistory(db: Db, jobId: string) {
  return db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.job_id, jobId))
    .orderBy(eventsTable.created_at);
}

/**
 * Fetches the most recent N events across all jobs for a given entity kind.
 *
 * @param db - Drizzle database instance.
 * @param entityKind - The entity kind to filter by.
 * @param limit - Maximum number of rows to return (default: 50).
 * @returns Array of event rows ordered newest-first.
 */
export async function getRecentEvents(db: Db, entityKind: EntityKind, limit = 50) {
  return db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.entity_kind, entityKind))
    .orderBy(desc(eventsTable.created_at))
    .limit(limit);
}
