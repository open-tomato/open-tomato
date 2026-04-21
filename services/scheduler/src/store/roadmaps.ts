/**
 * @packageDocumentation
 * Data-access helpers for the roadmaps and roadmap_plans tables.
 */

import type { Db } from '../db/index.js';
import type { NewRoadmap, Roadmap, RoadmapPlan } from '../db/schema.js';

import { asc, desc, eq } from 'drizzle-orm';

import { roadmapPlansTable, roadmapsTable } from '../db/schema.js';

// ---------------------------------------------------------------------------
// Roadmap CRUD
// ---------------------------------------------------------------------------

export async function createRoadmap(
  db: Db,
  params: Pick<NewRoadmap, 'name' | 'description'>,
): Promise<Roadmap> {
  const [row] = await db
    .insert(roadmapsTable)
    .values({ name: params.name, description: params.description })
    .returning();
  return row!;
}

export async function getRoadmap(
  db: Db,
  id: string,
): Promise<Roadmap | null> {
  const row = await db.query.roadmapsTable.findFirst({
    where: eq(roadmapsTable.id, id),
  });
  return row ?? null;
}

export async function listRoadmaps(
  db: Db,
  filters?: { excludeDeleted?: boolean },
): Promise<Roadmap[]> {
  return db.query.roadmapsTable.findMany({
    where: filters?.excludeDeleted !== false
      ? (fields, { ne }) => ne(fields.status, 'deleted')
      : undefined,
    orderBy: [desc(roadmapsTable.created_at)],
    limit: 100,
  });
}

export async function updateRoadmap(
  db: Db,
  id: string,
  patch: Partial<Pick<Roadmap, 'name' | 'description' | 'status' | 'updated_at'>>,
): Promise<Roadmap | null> {
  const [row] = await db
    .update(roadmapsTable)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(roadmapsTable.id, id))
    .returning();
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Roadmap Plans (junction table)
// ---------------------------------------------------------------------------

/**
 * Adds plans to a roadmap with the given execution order.
 */
export async function addPlansToRoadmap(
  db: Db,
  roadmapId: string,
  orderedPlanIds: ReadonlyArray<string>,
): Promise<RoadmapPlan[]> {
  if (orderedPlanIds.length === 0) return [];

  const values = orderedPlanIds.map((planId, idx) => ({
    roadmap_id: roadmapId,
    plan_id: planId,
    execution_order: idx,
    status: 'pending' as const,
  }));

  return db.insert(roadmapPlansTable).values(values).returning();
}

/**
 * Lists the plans in a roadmap, ordered by execution_order.
 */
export async function listRoadmapPlans(
  db: Db,
  roadmapId: string,
): Promise<RoadmapPlan[]> {
  return db
    .select()
    .from(roadmapPlansTable)
    .where(eq(roadmapPlansTable.roadmap_id, roadmapId))
    .orderBy(asc(roadmapPlansTable.execution_order));
}

/**
 * Updates the status of a specific roadmap-plan entry.
 */
export async function updateRoadmapPlanStatus(
  db: Db,
  roadmapPlanId: string,
  status: string,
): Promise<void> {
  await db
    .update(roadmapPlansTable)
    .set({ status })
    .where(eq(roadmapPlansTable.id, roadmapPlanId));
}

/**
 * Finds the next pending roadmap-plan entry (lowest execution_order with status 'pending').
 */
export async function findNextPendingRoadmapPlan(
  db: Db,
  roadmapId: string,
): Promise<RoadmapPlan | null> {
  const rows = await db
    .select()
    .from(roadmapPlansTable)
    .where(eq(roadmapPlansTable.roadmap_id, roadmapId))
    .orderBy(asc(roadmapPlansTable.execution_order));

  for (const r of rows) {
    if (r.status === 'pending') return r;
  }

  return null;
}
