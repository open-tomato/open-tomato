/**
 * `provision` — service-level platform provisioning input.
 *
 * Accepts three shorthands at the YAML layer:
 * - `true`  → default allowance (loader coerces to `{}`)
 * - `false` → opt-out (loader coerces to `{ disabled: true }`)
 * - an object → explicit knobs read by a platform plugin's `validateProvision`
 *
 * The schema only validates input shape; coercion to a single object form is
 * done by the loader (see {@link ./loader.ts}).
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
