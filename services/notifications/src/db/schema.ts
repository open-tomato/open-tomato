import {
  index,
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

export const entityKindEnum = pgEnum('entity_kind', [
  'anthropic',
  'executor',
  'mail',
  'push',
  'reminder',
  'prompt',
  'webhook',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'granted',
  'denied',
  'expired',
]);

export const approvalTypeEnum = pgEnum('approval_type', [
  'prerequisite',
  'human-loop',
]);

// ---------------------------------------------------------------------------
// Events — append-only activity stream
//
// `event_type` is text (not an enum) so each entity plugin owns its own
// event vocabulary without requiring DB enum migrations per new plugin.
//
// `job_id` is a soft UUID reference (no FK) — the executor service owns
// job state; notifications only stores events.
// ---------------------------------------------------------------------------

export const eventsTable = pgTable(
  'events',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Soft reference to the executor's jobs table — no FK constraint. */
    job_id: uuid().notNull(),
    entity_kind: entityKindEnum().notNull(),
    /** e.g. "task.done", "log", "loop.started" — owned by the entity plugin */
    event_type: text().notNull(),
    payload: jsonb().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    index('events_job_id_created_at_idx').on(t.job_id, t.created_at),
    index('events_entity_kind_idx').on(t.entity_kind),
  ],
);

export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Approvals — human gates that block executor progression
//
// `job_id` is a soft UUID reference (no FK) — the executor service owns
// job state; notifications only manages the approval workflow.
// ---------------------------------------------------------------------------

export const approvalsTable = pgTable(
  'approvals',
  {
    /** This is the requestId sent to the executor. */
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Soft reference to the executor's jobs table — no FK constraint. */
    job_id: uuid().notNull(),
    entity_kind: entityKindEnum().notNull(),
    approval_type: approvalTypeEnum().notNull(),
    status: approvalStatusEnum().notNull()
      .default('pending'),
    description: text().notNull(),
    /** Optional list of choices for multiple-choice approvals. */
    options: jsonb(),
    decision_note: text(),
    created_at: timestamp().notNull()
      .defaultNow(),
    decided_at: timestamp(),
    /** Optional TTL — a daemon can mark expired approvals on a schedule. */
    expires_at: timestamp(),
  },
  (t) => [
    index('approvals_job_id_status_idx').on(t.job_id, t.status),
    index('approvals_status_idx').on(t.status),
  ],
);

export type Approval = typeof approvalsTable.$inferSelect;
export type NewApproval = typeof approvalsTable.$inferInsert;
