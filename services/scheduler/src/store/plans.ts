import type { Db } from '../db/index.js';
import type { NewPlan, Plan } from '../db/schema.js';

import { and, count, desc, eq } from 'drizzle-orm';

import { plansTable } from '../db/schema.js';

export async function createPlan(
  db: Db,
  params: NewPlan,
): Promise<Plan> {
  const [row] = await db.insert(plansTable).values(params).returning();
  return row!;
}

export async function getPlan(
  db: Db,
  id: string,
): Promise<Plan | null> {
  const row = await db.query.plansTable.findFirst({
    where: eq(plansTable.id, id),
  });
  return row ?? null;
}

export async function listPlans(
  db: Db,
  filters?: { status?: string; requirementId?: string },
): Promise<Plan[]> {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(plansTable.status, filters.status as Plan['status']));
  }

  if (filters?.requirementId) {
    conditions.push(eq(plansTable.requirement_id, filters.requirementId));
  }

  return db.query.plansTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(plansTable.created_at)],
    limit: 100,
  });
}

export async function updatePlan(
  db: Db,
  id: string,
  patch: Partial<Pick<Plan, 'name' | 'description' | 'status' | 'executor_job_id' | 'branch' | 'updated_at'>>,
): Promise<Plan | null> {
  const [row] = await db
    .update(plansTable)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(plansTable.id, id))
    .returning();
  return row ?? null;
}

export async function countPlansByRequirementId(
  db: Db,
  requirementId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(plansTable)
    .where(eq(plansTable.requirement_id, requirementId));
  return result?.value ?? 0;
}
