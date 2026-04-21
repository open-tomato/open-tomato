import type { Db } from '../db/index.js';
import type { NewRequirement, Requirement } from '../db/schema.js';

import { and, count, desc, eq, ne } from 'drizzle-orm';

import { plansTable, requirementsTable } from '../db/schema.js';

export async function createRequirement(
  db: Db,
  params: NewRequirement,
): Promise<Requirement> {
  const [row] = await db.insert(requirementsTable).values(params).returning();
  return row!;
}

export async function getRequirement(
  db: Db,
  id: string,
): Promise<Requirement | null> {
  const row = await db.query.requirementsTable.findFirst({
    where: eq(requirementsTable.id, id),
  });
  return row ?? null;
}

export async function listRequirements(
  db: Db,
  filters?: { status?: string; hasValidationIssues?: boolean },
): Promise<Requirement[]> {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(requirementsTable.status, filters.status as Requirement['status']));
  }

  if (filters?.hasValidationIssues === true) {
    conditions.push(eq(requirementsTable.status, 'pending_validation'));
  } else if (filters?.hasValidationIssues === false) {
    conditions.push(ne(requirementsTable.status, 'pending_validation'));
    conditions.push(ne(requirementsTable.status, 'deleted'));
  }

  return db.query.requirementsTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(requirementsTable.created_at)],
    limit: 100,
  });
}

export async function updateRequirement(
  db: Db,
  id: string,
  patch: Partial<Pick<Requirement, 'name' | 'repository' | 'status' | 'validation_issues' | 'updated_at'>>,
): Promise<Requirement | null> {
  const [row] = await db
    .update(requirementsTable)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(requirementsTable.id, id))
    .returning();
  return row ?? null;
}

export async function deleteRequirement(
  db: Db,
  id: string,
): Promise<boolean> {
  const [planCount] = await db
    .select({ value: count() })
    .from(plansTable)
    .where(eq(plansTable.requirement_id, id));

  if (planCount && planCount.value > 0) {
    return false;
  }

  const [row] = await db
    .update(requirementsTable)
    .set({ status: 'deleted', updated_at: new Date() })
    .where(eq(requirementsTable.id, id))
    .returning();

  return row !== undefined;
}

export async function findByEntityTypeAndId(
  db: Db,
  entityType: string,
  entityId: string,
): Promise<Requirement | null> {
  const row = await db.query.requirementsTable.findFirst({
    where: and(
      eq(requirementsTable.entity_type, entityType),
      eq(requirementsTable.entity_id, entityId),
      ne(requirementsTable.status, 'deleted'),
    ),
  });
  return row ?? null;
}
