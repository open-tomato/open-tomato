import { z } from 'zod';

/**
 * Zod schema for the `tasks` section of the core config.
 *
 * Lists the task IDs that are enabled for the current orchestration run.
 */
export const TasksSchema = z.object({
  enabled: z.array(z.string()).default([]),
});

/** Inferred TypeScript type for {@link TasksSchema}. */
export type Tasks = z.infer<typeof TasksSchema>;
