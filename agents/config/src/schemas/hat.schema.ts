import { z } from 'zod';

import { RESERVED_TRIGGER_NAMES } from '../constants.js';

import { BackendFieldSchema } from './backend-descriptor.schema.js';

/**
 * Zod schema for a single hat definition.
 *
 * A hat describes an agent role: what events trigger it, what events it
 * publishes, the instructions it follows, and runtime constraints such as
 * concurrency and max activations. Trigger names must not overlap with the
 * reserved set defined in {@link RESERVED_TRIGGER_NAMES}.
 */
export const HatSchema = z.object({
  id: z.string(),
  triggers: z.array(z.string()).min(1),
  publishes: z.array(z.string()).default([]),
  instructions: z.string(),
  backend: BackendFieldSchema.optional(),
  concurrency: z.number().int()
    .positive()
    .default(1),
  aggregate: z.boolean().default(false),
  disallowed_tools: z.array(z.string()).default([]),
  max_activations: z.number().int()
    .positive()
    .optional(),
}).refine(
  (val) => !val.triggers.some((t) => RESERVED_TRIGGER_NAMES.has(t)),
  {
    message: `triggers must not include reserved names: ${[...RESERVED_TRIGGER_NAMES].join(', ')}`,
    path: ['triggers'],
  },
);

/** Inferred TypeScript type for {@link HatSchema}. */
export type Hat = z.infer<typeof HatSchema>;
