import type { Db } from '../db/index.js';
import type { Task } from '../db/schema.js';

import { asc, eq } from 'drizzle-orm';

import { tasksTable } from '../db/schema.js';

export async function bulkCreateTasks(
  db: Db,
  planId: string,
  tasks: ReadonlyArray<{ index: number; text: string }>,
): Promise<Task[]> {
  if (tasks.length === 0) return [];

  const rows = tasks.map((task) => ({
    plan_id: planId,
    task_index: task.index,
    task_text: task.text,
  }));

  return db.insert(tasksTable).values(rows).returning();
}

export async function listPlanTasks(
  db: Db,
  planId: string,
): Promise<Task[]> {
  return db.query.tasksTable.findMany({
    where: eq(tasksTable.plan_id, planId),
    orderBy: [asc(tasksTable.task_index)],
  });
}

export async function updateTaskStatus(
  db: Db,
  taskId: string,
  status: string,
  meta?: { completedAt?: Date; durationMs?: number; exitCode?: number },
): Promise<void> {
  await db
    .update(tasksTable)
    .set({
      status: status as Task['status'],
      ...(meta?.completedAt ? { completed_at: meta.completedAt } : {}),
      ...(meta?.durationMs !== undefined ? { duration_ms: meta.durationMs } : {}),
      ...(meta?.exitCode !== undefined ? { exit_code: meta.exitCode } : {}),
      updated_at: new Date(),
    })
    .where(eq(tasksTable.id, taskId));
}
