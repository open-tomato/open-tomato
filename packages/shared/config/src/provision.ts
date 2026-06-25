/**
 * `provision` — service-level platform provisioning input.
 *
 * Accepts three shorthands at the YAML layer:
 * - `true`  → default allowance (coerced to `{}`)
 * - `false` → opt-out (coerced to `{ disabled: true }`)
 * - an object → explicit knobs read by a platform plugin's `validateProvision`
 *
 * {@link ProvisionSchema} validates input shape; {@link coerceProvision}
 * normalizes the three shorthands into a single object form so downstream
 * consumers only need to handle one shape.
 */
import { z } from 'zod';

/** Object form of `provision` accepted in YAML and produced by coercion. */
export const ProvisionObjectSchema = z.object({
  disabled: z.boolean().optional(),
  caps: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Inferred object form of `provision`. */
export type ProvisionObject = z.infer<typeof ProvisionObjectSchema>;

/**
 * Raw `provision` input as it appears in YAML. Either of the boolean
 * shorthands or the full object form is accepted.
 */
export const ProvisionSchema = z.union([
  z.literal(true),
  z.literal(false),
  ProvisionObjectSchema,
]);

/** Inferred raw `provision` input (before loader coercion). */
export type ProvisionInput = z.infer<typeof ProvisionSchema>;

/**
 * Normalize the three accepted shorthands into a single object form.
 *
 * - `undefined` → `undefined` (field absent stays absent)
 * - `true`      → `{}` (default allowance)
 * - `false`     → `{ disabled: true }` (explicit opt-out)
 * - object      → validated and returned as-is
 *
 * Any other shape (e.g. the string `"yes"`) throws a Zod validation error.
 */
export function coerceProvision(input: unknown): ProvisionObject | undefined {
  if (input === undefined) {
    return undefined;
  }

  const parsed = ProvisionSchema.parse(input);

  if (parsed === true) {
    return {};
  }

  if (parsed === false) {
    return { disabled: true };
  }

  return parsed;
}
