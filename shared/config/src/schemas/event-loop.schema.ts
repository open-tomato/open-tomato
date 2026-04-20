import { z } from 'zod';

/**
 * Zod schema for the `event_loop` section of the core config.
 *
 * Controls how many iterations the orchestrator runs, optional time and cost
 * caps, completion semantics, and hat-scope enforcement.
 */
export const EventLoopSchema = z.object({
  iterations: z.number().int()
    .positive()
    .default(10),
  runtime_ms: z.number().positive()
    .optional(),
  cost_limit_usd: z.number().positive()
    .optional(),
  completion_promise: z.string().optional(),
  required_events: z.array(z.string()).default([]),
  enforce_hat_scope: z.boolean().default(false),
});

/** Inferred TypeScript type for {@link EventLoopSchema}. */
export type EventLoop = z.infer<typeof EventLoopSchema>;
