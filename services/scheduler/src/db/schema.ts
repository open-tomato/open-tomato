/**
 * @packageDocumentation
 * Drizzle schema for the schedulus service's PostgreSQL database.
 *
 * Tables:
 * - `requirements` — imported feature requests from external sources
 * - `plans` — generated dev plans with task lists
 * - `tasks` — individual units of work within a plan
 * - `roadmaps` — ordered collections of plans
 * - `roadmap_plans` — junction table with execution ordering
 * - `plan_dependencies` — which plan blocks which
 * - `execution_logs` — audit trail for plans and roadmaps
 */
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const requirementStatusEnum = pgEnum('requirement_status', [
  'pending_validation',
  'validated',
  'planning',
  'planned',
  'deleted',
]);

export const planStatusEnum = pgEnum('plan_status', [
  'backlog',
  'ready',
  'dispatched',
  'running',
  'completed',
  'failed',
  'cancelled',
  'blocked',
  'deleted',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'running',
  'done',
  'failed',
  'blocked',
]);

export const roadmapStatusEnum = pgEnum('roadmap_status', [
  'draft',
  'ready',
  'running',
  'completed',
  'failed',
  'cancelled',
  'deleted',
]);

// ---------------------------------------------------------------------------
// Requirements — imported feature requests from external sources
// ---------------------------------------------------------------------------

export const requirementsTable = pgTable(
  'requirements',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Source type: 'linear', 'md', 'manual'. */
    entity_type: text().notNull(),
    /** Source identifier — Linear identifier (e.g. OPT-123), filename, etc. */
    entity_id: text().notNull(),
    /** Additional source metadata (Linear UUID, team, project, blocking/blockedBy). */
    entity_metadata: jsonb(),
    name: text().notNull(),
    /** Raw MD body from Linear issue or uploaded file content. */
    description: text(),
    /** Target repository. Null means validation issue (missing_repository). */
    repository: text(),
    /** Short identifier used for branch naming (e.g. OPT-123). */
    identifier: text(),
    status: requirementStatusEnum().notNull()
      .default('pending_validation'),
    /** Array of { type, message, resolved } validation issue objects. */
    validation_issues: jsonb().$type<ValidationIssue[]>(),
    created_at: timestamp().notNull()
      .defaultNow(),
    updated_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('requirements_entity_type_entity_id_idx').on(t.entity_type, t.entity_id),
    index('requirements_status_idx').on(t.status),
    index('requirements_identifier_idx').on(t.identifier),
  ],
);

export type Requirement = typeof requirementsTable.$inferSelect;
export type NewRequirement = typeof requirementsTable.$inferInsert;

/** Validation issue stored in the `validation_issues` JSONB column. */
export interface ValidationIssue {
  type: 'duplicate_name' | 'missing_repository' | 'branch_conflict';
  message: string;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Plans — generated dev plans with task lists
// ---------------------------------------------------------------------------

export const plansTable = pgTable(
  'plans',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Parent requirement this plan was generated from. */
    requirement_id: uuid()
      .references(() => requirementsTable.id),
    name: text().notNull(),
    description: text(),
    repository: text().notNull(),
    /** Git branch (e.g. feature/OPT-123). */
    branch: text(),
    status: planStatusEnum().notNull()
      .default('backlog'),
    /** UUID of the job created in the executor service after dispatch. */
    executor_job_id: uuid(),
    /** SHA checksum of the plan content at dispatch time. */
    plan_checksum: text(),
    created_at: timestamp().notNull()
      .defaultNow(),
    updated_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    index('plans_requirement_id_idx').on(t.requirement_id),
    index('plans_status_idx').on(t.status),
    index('plans_executor_job_id_idx').on(t.executor_job_id),
  ],
);

export type Plan = typeof plansTable.$inferSelect;
export type NewPlan = typeof plansTable.$inferInsert;

// ---------------------------------------------------------------------------
// Tasks — individual units of work within a plan
// ---------------------------------------------------------------------------

export const tasksTable = pgTable(
  'tasks',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    plan_id: uuid()
      .notNull()
      .references(() => plansTable.id),
    task_index: integer().notNull(),
    task_text: text().notNull(),
    status: taskStatusEnum().notNull()
      .default('pending'),
    started_at: timestamp(),
    completed_at: timestamp(),
    duration_ms: integer(),
    exit_code: integer(),
    created_at: timestamp().notNull()
      .defaultNow(),
    updated_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    index('tasks_plan_id_task_index_idx').on(t.plan_id, t.task_index),
    index('tasks_plan_id_status_idx').on(t.plan_id, t.status),
  ],
);

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

// ---------------------------------------------------------------------------
// Roadmaps — ordered collections of plans
// ---------------------------------------------------------------------------

export const roadmapsTable = pgTable(
  'roadmaps',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    name: text().notNull(),
    description: text(),
    status: roadmapStatusEnum().notNull()
      .default('draft'),
    created_at: timestamp().notNull()
      .defaultNow(),
    updated_at: timestamp().notNull()
      .defaultNow(),
  },
);

export type Roadmap = typeof roadmapsTable.$inferSelect;
export type NewRoadmap = typeof roadmapsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Roadmap Plans — junction table with execution ordering
// ---------------------------------------------------------------------------

export const roadmapPlansTable = pgTable(
  'roadmap_plans',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    roadmap_id: uuid()
      .notNull()
      .references(() => roadmapsTable.id),
    plan_id: uuid()
      .notNull()
      .references(() => plansTable.id),
    execution_order: integer().notNull(),
    /** Status within the roadmap: pending, running, completed, failed, skipped. */
    status: text().notNull()
      .default('pending'),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('roadmap_plans_roadmap_order_idx').on(t.roadmap_id, t.execution_order),
    index('roadmap_plans_plan_id_idx').on(t.plan_id),
  ],
);

export type RoadmapPlan = typeof roadmapPlansTable.$inferSelect;
export type NewRoadmapPlan = typeof roadmapPlansTable.$inferInsert;

// ---------------------------------------------------------------------------
// Plan Dependencies — which plan blocks which
// ---------------------------------------------------------------------------

export const planDependenciesTable = pgTable(
  'plan_dependencies',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    plan_id: uuid()
      .notNull()
      .references(() => plansTable.id),
    depends_on_plan_id: uuid()
      .notNull()
      .references(() => plansTable.id),
    /** Where this dependency came from: 'linear', 'manual'. */
    source: text().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('plan_dependencies_unique_idx').on(t.plan_id, t.depends_on_plan_id),
  ],
);

export type PlanDependency = typeof planDependenciesTable.$inferSelect;
export type NewPlanDependency = typeof planDependenciesTable.$inferInsert;

// ---------------------------------------------------------------------------
// Execution Logs — audit trail for plans and roadmaps
// ---------------------------------------------------------------------------

export const executionLogsTable = pgTable(
  'execution_logs',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    plan_id: uuid()
      .references(() => plansTable.id),
    roadmap_id: uuid()
      .references(() => roadmapsTable.id),
    event_type: text().notNull(),
    status_message: text(),
    metadata: jsonb(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    index('execution_logs_plan_id_idx').on(t.plan_id),
    index('execution_logs_roadmap_id_idx').on(t.roadmap_id),
  ],
);

export type ExecutionLog = typeof executionLogsTable.$inferSelect;
export type NewExecutionLog = typeof executionLogsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Relations (for Drizzle relational queries)
// ---------------------------------------------------------------------------

export const requirementsRelations = relations(requirementsTable, ({ many }) => ({
  plans: many(plansTable),
}));

export const plansRelations = relations(plansTable, ({ one, many }) => ({
  requirement: one(requirementsTable, {
    fields: [plansTable.requirement_id],
    references: [requirementsTable.id],
  }),
  tasks: many(tasksTable),
  roadmapPlans: many(roadmapPlansTable),
  dependencies: many(planDependenciesTable, { relationName: 'planDependencies' }),
  dependents: many(planDependenciesTable, { relationName: 'planDependents' }),
}));

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  plan: one(plansTable, {
    fields: [tasksTable.plan_id],
    references: [plansTable.id],
  }),
}));

export const roadmapsRelations = relations(roadmapsTable, ({ many }) => ({
  roadmapPlans: many(roadmapPlansTable),
}));

export const roadmapPlansRelations = relations(roadmapPlansTable, ({ one }) => ({
  roadmap: one(roadmapsTable, {
    fields: [roadmapPlansTable.roadmap_id],
    references: [roadmapsTable.id],
  }),
  plan: one(plansTable, {
    fields: [roadmapPlansTable.plan_id],
    references: [plansTable.id],
  }),
}));

export const planDependenciesRelations = relations(planDependenciesTable, ({ one }) => ({
  plan: one(plansTable, {
    fields: [planDependenciesTable.plan_id],
    references: [plansTable.id],
    relationName: 'planDependencies',
  }),
  dependsOn: one(plansTable, {
    fields: [planDependenciesTable.depends_on_plan_id],
    references: [plansTable.id],
    relationName: 'planDependents',
  }),
}));

export const executionLogsRelations = relations(executionLogsTable, ({ one }) => ({
  plan: one(plansTable, {
    fields: [executionLogsTable.plan_id],
    references: [plansTable.id],
  }),
  roadmap: one(roadmapsTable, {
    fields: [executionLogsTable.roadmap_id],
    references: [roadmapsTable.id],
  }),
}));
