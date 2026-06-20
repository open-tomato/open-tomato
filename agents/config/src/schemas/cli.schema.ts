import { z } from 'zod';

/**
 * Zod schema for the `cli` section of the core config.
 *
 * Configures the CLI backend and prompt interaction mode.
 */
export const CliSchema = z.object({
  backend: z.string().default('anthropic'),
  prompt_mode: z.enum(['interactive', 'oneshot']).default('oneshot'),
});

/** Inferred TypeScript type for {@link CliSchema}. */
export type Cli = z.infer<typeof CliSchema>;
