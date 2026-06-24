/**
 * Local copies of the notification service entity payload schemas.
 *
 * NOTE (CLI): This file mirrors the schemas defined in
 * `services/notifications/src/entity/plugins/`. It exists so the CLI can
 * validate payloads locally before sending them to the service.
 *
 * If the service schemas change, update this file to stay in sync.
 * A comment referencing this file should be added to the service plugin when
 * contracts change, so CLI consumers can trace the update.
 *
 * TODO: Replace with a proper shared package (e.g. @open-tomato/notifications-schemas)
 * once the notification service package extraction is complete.
 */
import type { EntityKind } from './config.js';
import type { ZodTypeAny } from 'zod';

import { z } from 'zod';

// ── Envelope ────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/routes/events.ts → EventEnvelopeSchema

export const EventEnvelopeSchema = z.object({
  jobId: z.string().uuid(),
  nodeId: z.string().min(1),
  type: z.string().min(1),
});

// ── Executor ─────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/executor.ts

export const ExecutorEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('loop.started'),
    branch: z.string(),
    planChecksum: z.string().optional(),
    planTasksCount: z.number(),
    prereqTasksCount: z.number(),
  }),
  z.object({ type: z.literal('loop.done'), tasksCompleted: z.number(), tasksFailed: z.number() }),
  z.object({ type: z.literal('loop.cancelled'), reason: z.string() }),
  z.object({ type: z.literal('loop.paused') }),
  z.object({ type: z.literal('loop.resumed') }),
  z.object({ type: z.literal('task.started'), taskIndex: z.number(), taskText: z.string() }),
  z.object({
    type: z.literal('task.done'),
    taskIndex: z.number(),
    durationMs: z.number(),
    taskId: z.string().uuid()
      .optional(),
  }),
  z.object({
    type: z.literal('task.failed'),
    taskIndex: z.number(),
    exitCode: z.number(),
    taskId: z.string().uuid()
      .optional(),
  }),
  z.object({
    type: z.literal('task.blocked'),
    taskIndex: z.number(),
    taskId: z.string().uuid()
      .optional(),
  }),
  z.object({
    type: z.literal('log'),
    stream: z.enum(['stdout', 'stderr']),
    line: z.string(),
  }),
  z.object({
    type: z.literal('prerequisite.check'),
    item: z.string(),
    tag: z.enum(['auto', 'human']),
    result: z.enum(['pass', 'fail', 'pending']),
  }),
]);

// ── Mail ─────────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/stubs.ts → mail

export const MailEventSchema = z.object({
  type: z.string().min(1),
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  provider: z.enum(['resend', 'sendgrid']).default('resend'),
});

// ── Push ─────────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/stubs.ts → push

export const PushEventSchema = z.object({
  type: z.string().min(1),
  deviceToken: z.string(),
  title: z.string(),
  body: z.string(),
  provider: z.enum(['fcm', 'apns']),
});

// ── Reminder ─────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/stubs.ts → reminder

export const ReminderEventSchema = z.object({
  type: z.string().min(1),
  message: z.string(),
  scheduledAt: z.string().datetime(),
});

// ── Prompt ───────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/stubs.ts → prompt

export const PromptEventSchema = z.object({
  type: z.string().min(1),
  message: z.string(),
  options: z.array(z.string()).optional(),
});

// ── Webhook ──────────────────────────────────────────────────────────────────
// Mirrors: services/notifications/src/entity/plugins/webhook.ts

export const WebhookEventSchema = z.object({
  type: z.string().min(1),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

// ── Registry ─────────────────────────────────────────────────────────────────

export const entitySchemas: Record<EntityKind, ZodTypeAny> = {
  executor: ExecutorEventSchema,
  mail: MailEventSchema,
  push: PushEventSchema,
  reminder: ReminderEventSchema,
  prompt: PromptEventSchema,
  webhook: WebhookEventSchema,
};

/**
 * Returns the event type literals for a given entity kind, for use in prompts.
 * Returns an empty array for kinds that use a free-form type string.
 */
export function getEventTypesForKind(kind: EntityKind): string[] {
  const typeMap: Partial<Record<EntityKind, string[]>> = {
    executor: [
      'loop.started',
      'loop.done',
      'loop.cancelled',
      'loop.paused',
      'loop.resumed',
      'task.started',
      'task.done',
      'task.failed',
      'task.blocked',
      'log',
      'prerequisite.check',
    ],
  };
  return typeMap[kind] ?? [];
}
