import { z } from 'zod';

/**
 * Zod schema for the `features` section of the core config.
 *
 * Feature flags that enable or disable optional orchestrator capabilities.
 */
export const FeaturesSchema = z.object({
  parallel: z.boolean().default(false),
  auto_merge: z.boolean().default(false),
  preflight: z.boolean().default(true),
});

/** Inferred TypeScript type for {@link FeaturesSchema}. */
export type Features = z.infer<typeof FeaturesSchema>;
