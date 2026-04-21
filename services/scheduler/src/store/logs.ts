import type { Db } from '../db/index.js';
import type { ExecutionLog } from '../db/schema.js';

import { desc, eq } from 'drizzle-orm';

import { executionLogsTable } from '../db/schema.js';

export async function createLog(
  db: Db,
  params: {
    plan_id?: string;
    roadmap_id?: string;
    event_type: string;
    status_message?: string;
    metadata?: unknown;
  },
): Promise<ExecutionLog> {
  const [row] = await db
    .insert(executionLogsTable)
    .values({
      plan_id: params.plan_id ?? null,
      roadmap_id: params.roadmap_id ?? null,
      event_type: params.event_type,
      status_message: params.status_message ?? null,
      metadata: params.metadata ?? null,
    })
    .returning();
  return row!;
}

export async function listPlanLogs(
  db: Db,
  planId: string,
): Promise<ExecutionLog[]> {
  return db.query.executionLogsTable.findMany({
    where: eq(executionLogsTable.plan_id, planId),
    orderBy: [desc(executionLogsTable.created_at)],
  });
}
