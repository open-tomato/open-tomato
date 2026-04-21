/**
 * @packageDocumentation
 * Executor entity plugin — full implementation.
 *
 * Handles the activity stream and approval workflow for the ralph loop
 * running on cluster nodes. All other entity plugins are stubs; this is
 * the first concrete entity.
 */
import { z } from 'zod';

import { entityRegistry } from '../registry.js';

const ExecutorEventSchema = z.discriminatedUnion('type', [
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
  z.object({ type: z.literal('task.done'), taskIndex: z.number(), durationMs: z.number(), taskId: z.string().uuid()
    .optional() }),
  z.object({ type: z.literal('task.failed'), taskIndex: z.number(), exitCode: z.number(), taskId: z.string().uuid()
    .optional() }),
  z.object({ type: z.literal('task.blocked'), taskIndex: z.number(), taskId: z.string().uuid()
    .optional() }),
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

export type ExecutorEvent = z.infer<typeof ExecutorEventSchema>;

/**
 * Registers the executor entity plugin with the global registry.
 *
 * Must be called before the HTTP server starts accepting requests.
 */
export function registerExecutorEntityPlugin(): void {
  entityRegistry.register({
    kind: 'executor',
    providers: ['sse', 'inline-http'],
    direction: 'bidirectional',
    interactive: true,
    payloadSchema: ExecutorEventSchema,
  });
}
