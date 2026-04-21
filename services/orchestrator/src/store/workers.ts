/**
 * @packageDocumentation
 * Data-access helpers for the workers table.
 *
 * Adapted from `services/notifications/src/store/nodes.ts` — renamed
 * node → worker to match the executor orchestrator model.
 */
import type { Db } from '../db/index.js';
import type { NewWorker } from '../db/schema.js';

import { eq } from 'drizzle-orm';

import { workersTable } from '../db/schema.js';

/**
 * Inserts a worker or updates its address, status, and metadata on conflict.
 *
 * @param db - Drizzle database instance.
 * @param worker - Worker fields to upsert.
 * @returns The inserted or updated worker row.
 */
export async function upsertWorker(db: Db, worker: NewWorker) {
  const [row] = await db
    .insert(workersTable)
    .values(worker)
    .onConflictDoUpdate({
      target: workersTable.id,
      set: {
        status: worker.status,
        address: worker.address,
        last_seen_at: new Date(),
        metadata: worker.metadata,
      },
    })
    .returning();

  return row;
}

/**
 * Returns all registered workers ordered by id.
 *
 * @param db - Drizzle database instance.
 * @returns Array of worker rows.
 */
export async function listWorkers(db: Db) {
  return db.select().from(workersTable)
    .orderBy(workersTable.id);
}

/**
 * Looks up a single worker by its identifier.
 *
 * @param db - Drizzle database instance.
 * @param workerId - The worker identifier (e.g. `"docker-01"`).
 * @returns The worker row, or `null` if not found.
 */
export async function getWorker(db: Db, workerId: string) {
  const [row] = await db
    .select()
    .from(workersTable)
    .where(eq(workersTable.id, workerId));

  return row ?? null;
}

/**
 * Returns the first idle worker, or `null` if none is available.
 *
 * Selection is deterministic (ordered by worker id) so the same worker is
 * preferred when multiple idle workers exist.
 *
 * @param db - Drizzle database instance.
 * @returns The first idle worker row, or `null`.
 */
export async function findIdleWorker(db: Db) {
  const [row] = await db
    .select()
    .from(workersTable)
    .where(eq(workersTable.status, 'idle'))
    .orderBy(workersTable.id)
    .limit(1);

  return row ?? null;
}

/**
 * Updates the status of a worker and refreshes `last_seen_at`.
 *
 * @param db - Drizzle database instance.
 * @param workerId - The worker to update.
 * @param status - New status to set.
 */
export async function setWorkerStatus(
  db: Db,
  workerId: string,
  status: 'idle' | 'busy' | 'offline' | 'error',
) {
  await db
    .update(workersTable)
    .set({ status, last_seen_at: new Date() })
    .where(eq(workersTable.id, workerId));
}

/**
 * Removes a worker from the registry.
 *
 * @param db - Drizzle database instance.
 * @param workerId - The worker to remove.
 */
export async function deleteWorker(db: Db, workerId: string) {
  await db
    .delete(workersTable)
    .where(eq(workersTable.id, workerId));
}
