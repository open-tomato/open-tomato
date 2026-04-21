/**
 * @packageDocumentation
 * Data-access helpers for the plan_dependencies table and
 * topological sorting of plans by their dependency graph.
 */

import type { Db } from '../db/index.js';
import type { PlanDependency } from '../db/schema.js';

import { and, eq, inArray } from 'drizzle-orm';

import { planDependenciesTable } from '../db/schema.js';

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a dependency: `planId` depends on `dependsOnPlanId`.
 * Silently ignores duplicates (unique constraint).
 */
export async function createDependency(
  db: Db,
  planId: string,
  dependsOnPlanId: string,
  source: string,
): Promise<PlanDependency | null> {
  try {
    const [row] = await db
      .insert(planDependenciesTable)
      .values({ plan_id: planId, depends_on_plan_id: dependsOnPlanId, source })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Lists all dependencies for a plan (what it depends on).
 */
export async function listDependencies(
  db: Db,
  planId: string,
): Promise<PlanDependency[]> {
  return db
    .select()
    .from(planDependenciesTable)
    .where(eq(planDependenciesTable.plan_id, planId));
}

/**
 * Lists all dependents of a plan (what depends on it).
 */
export async function listDependents(
  db: Db,
  planId: string,
): Promise<PlanDependency[]> {
  return db
    .select()
    .from(planDependenciesTable)
    .where(eq(planDependenciesTable.depends_on_plan_id, planId));
}

/**
 * Bulk-creates dependencies from Linear blocking/blockedBy relations.
 *
 * Given a map of `identifier → planId`, and each requirement's blocking
 * metadata, creates dependency rows for all resolved relations.
 */
export async function createDependenciesFromLinear(
  db: Db,
  identifierToPlanId: ReadonlyMap<string, string>,
  relations: ReadonlyArray<{
    planId: string;
    blockedByIdentifiers: string[];
  }>,
): Promise<number> {
  let created = 0;

  for (const { planId, blockedByIdentifiers } of relations) {
    for (const blockedByIdentifier of blockedByIdentifiers) {
      const dependsOnPlanId = identifierToPlanId.get(blockedByIdentifier);
      if (dependsOnPlanId) {
        const result = await createDependency(db, planId, dependsOnPlanId, 'linear');
        if (result) created++;
      }
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

/**
 * Topologically sorts a set of plan IDs based on their dependency graph.
 *
 * Plans with no dependencies come first. Plans that depend on others
 * come after their dependencies. Plans at the same dependency level
 * preserve their input order.
 *
 * @throws Error if a cycle is detected in the dependency graph.
 */
export async function topologicalSort(
  db: Db,
  planIds: ReadonlyArray<string>,
): Promise<string[]> {
  if (planIds.length <= 1) return [...planIds];

  // Fetch all dependencies between the given plans
  const deps = await db
    .select()
    .from(planDependenciesTable)
    .where(
      and(
        inArray(planDependenciesTable.plan_id, [...planIds]),
        inArray(planDependenciesTable.depends_on_plan_id, [...planIds]),
      ),
    );

  // Build adjacency list and in-degree map
  const planIdSet = new Set(planIds);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of planIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const dep of deps) {
    if (planIdSet.has(dep.plan_id) && planIdSet.has(dep.depends_on_plan_id)) {
      // dep.plan_id depends on dep.depends_on_plan_id
      // So depends_on_plan_id → plan_id (edge from dependency to dependent)
      const existing = adjacency.get(dep.depends_on_plan_id) ?? [];
      existing.push(dep.plan_id);
      adjacency.set(dep.depends_on_plan_id, existing);
      inDegree.set(dep.plan_id, (inDegree.get(dep.plan_id) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const inputOrder = new Map(planIds.map((id, idx) => [id, idx]));

  // Initialize queue with zero-degree nodes, preserving input order
  for (const id of planIds) {
    if ((inDegree.get(id) ?? 0) === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    // Sort queue by input order to produce stable output
    queue.sort((a, b) => (inputOrder.get(a) ?? 0) - (inputOrder.get(b) ?? 0));
    const current = queue.shift()!;
    sorted.push(current);

    for (const dependent of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  if (sorted.length !== planIds.length) {
    throw new Error('Cycle detected in plan dependencies — cannot determine execution order');
  }

  return sorted;
}
