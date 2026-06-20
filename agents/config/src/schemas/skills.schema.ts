import { z } from 'zod';

/**
 * Zod schema for a single skill override entry.
 *
 * Allows enabling/disabling a skill by name and adjusting its resolution
 * priority relative to other skills.
 */
export const SkillOverrideSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int()
    .positive()
    .optional(),
});

/**
 * Zod schema for the `skills` section of the core config.
 *
 * Lists additional skill directories to scan and per-skill override settings.
 */
export const SkillsSchema = z.object({
  dirs: z.array(z.string()).default([]),
  overrides: z.record(z.string(), SkillOverrideSchema).default({}),
});

/** Inferred TypeScript type for {@link SkillOverrideSchema}. */
export type SkillOverride = z.infer<typeof SkillOverrideSchema>;
/** Inferred TypeScript type for {@link SkillsSchema}. */
export type Skills = z.infer<typeof SkillsSchema>;
