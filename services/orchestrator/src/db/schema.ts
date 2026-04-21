/**
 * @packageDocumentation
 * Drizzle schema for the executor service's own PostgreSQL database.
 *
 * Tables: `workers` (pool registry), `jobs` (dispatched loop runs),
 * `tasks` (individual task rows within a job).
 *
 * Migrated from `services/notifications` as part of the executor orchestrator
 * refactoring — see `REFACTORING.md`.
 */
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
  'blocked',
]);

export const workerStatusEnum = pgEnum('worker_status', [
  'idle',
  'busy',
  'offline',
  'error',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'running',
  'done',
  'failed',
  'blocked',
]);

// ---------------------------------------------------------------------------
// Workers — pool of Claude-as-container worker backends
// ---------------------------------------------------------------------------

export const workersTable = pgTable('workers', {
  /** Worker identifier, e.g. "docker-01" or a pod name. */
  id: text().primaryKey(),
  status: workerStatusEnum().notNull()
    .default('offline'),
  /** Base URL or container ID depending on worker type. */
  address: text().notNull(),
  last_seen_at: timestamp().notNull()
    .defaultNow(),
  /** Arbitrary key/value worker metadata (cpu, arch, labels, etc.). */
  metadata: jsonb(),
});

export type Worker = typeof workersTable.$inferSelect;
export type NewWorker = typeof workersTable.$inferInsert;

// ---------------------------------------------------------------------------
// Jobs — one row per dispatched execution (one ralph loop run)
// ---------------------------------------------------------------------------

export const jobsTable = pgTable(
  'jobs',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Worker assigned to this job (soft reference to workers.id). */
    worker_id: text(),
    /** Human-readable anchor (plan ID / issue ID). */
    source_id: text().notNull(),
    branch: text().notNull(),
    /** SHA of PLAN.md at dispatch time. */
    plan_checksum: text(),
    status: jobStatusEnum().notNull()
      .default('pending'),
    created_at: timestamp().notNull()
      .defaultNow(),
    started_at: timestamp(),
    completed_at: timestamp(),
    /** Number of tasks in PLAN.md, populated on loop.started. */
    plan_tasks_count: integer(),
    /** Number of tasks in PREREQUISITES.md, populated on loop.started. */
    prereq_tasks_count: integer(),
    metadata: jsonb(),
  },
  (t) => [
    index('jobs_worker_id_status_idx').on(t.worker_id, t.status),
    index('jobs_source_id_idx').on(t.source_id),
  ],
);

export type Job = typeof jobsTable.$inferSelect;
export type NewJob = typeof jobsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Tasks — individual task rows, one per task.started
//
// Created directly by the executor loop runner (no longer via notifications
// event side-effect). The UUID is generated locally.
// ---------------------------------------------------------------------------

export const tasksTable = pgTable(
  'tasks',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    job_id: uuid()
      .notNull()
      .references(() => jobsTable.id),
    task_index: integer().notNull(),
    task_text: text().notNull(),
    /** `'pending' | 'running' | 'done' | 'failed' | 'blocked'` */
    status: taskStatusEnum().notNull()
      .default('pending'),
    started_at: timestamp().notNull()
      .defaultNow(),
    completed_at: timestamp(),
    duration_ms: integer(),
    exit_code: integer(),
  },
  (t) => [
    index('tasks_job_id_task_index_idx').on(t.job_id, t.task_index),
    index('tasks_job_id_status_idx').on(t.job_id, t.status),
  ],
);

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
