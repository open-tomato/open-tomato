import { z } from 'zod';

import { HatSchema } from './hat.schema.js';

/**
 * Zod schema for a hat collection.
 *
 * A collection groups one or more hat definitions under a shared version
 * string. Two refinements are enforced:
 * - **Ambiguous routing**: no two hats may have identical trigger lists
 *   (compared as sorted, null-delimited strings).
 * - **Wave-config**: if any hat has `aggregate: true`, at least one
 *   non-aggregate hat must also be present in the same collection.
 */
export const HatCollectionSchema = z.object({
  version: z.string().default('1'),
  hats: z.array(HatSchema).min(1),
}).refine(
  ({ hats }) => {
    const seen = new Set<string>();
    for (const hat of hats) {
      const key = [...hat.triggers].sort().join('\0');
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  },
  {
    message: 'ambiguous routing: two or more hats share identical trigger lists',
    path: ['hats'],
  },
)
  .refine(
    ({ hats }) => {
      const hasAggregate = hats.some((hat) => hat.aggregate);
      if (!hasAggregate) return true;
      return hats.some((hat) => !hat.aggregate);
    },
    {
      message: 'wave-config invalid: aggregate hats require at least one non-aggregate hat in the same collection',
      path: ['hats'],
    },
  );

/** Inferred TypeScript type for {@link HatCollectionSchema}. */
export type HatCollection = z.infer<typeof HatCollectionSchema>;
