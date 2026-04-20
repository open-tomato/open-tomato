import { z } from 'zod';

/**
 * Zod schema for the `core` (internal) section of the core config.
 *
 * Controls the orchestrator's scratchpad path, spec directory, and active
 * guardrail rules.
 */
export const CoreInternalSchema = z.object({
  scratchpad: z.string().optional(),
  specs_dir: z.string().optional(),
  guardrails: z.array(z.string()).default([]),
});

/** Inferred TypeScript type for {@link CoreInternalSchema}. */
export type CoreInternal = z.infer<typeof CoreInternalSchema>;
