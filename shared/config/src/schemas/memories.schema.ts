import { z } from 'zod';

/**
 * Zod schema for the `memories` section of the core config.
 *
 * Controls how prior session memories are injected into the agent context,
 * the token budget allocated to them, and an optional inclusion filter.
 */
export const MemoriesSchema = z.object({
  inject_mode: z.enum(['prepend', 'append', 'none']).default('prepend'),
  budget: z.number().int()
    .positive()
    .optional(),
  filter: z.array(z.string()).default([]),
});

/** Inferred TypeScript type for {@link MemoriesSchema}. */
export type Memories = z.infer<typeof MemoriesSchema>;
