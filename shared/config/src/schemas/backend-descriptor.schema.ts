import { z } from 'zod';

/** How the prompt is delivered to the backend process. */
export const PromptModeSchema = z.enum(['flag', 'stdin', 'positional']);

/** How the backend emits its response. */
export const OutputFormatSchema = z.enum(['text', 'stream-json', 'pi-stream-json', 'acp']);

/**
 * Zod schema for a custom backend descriptor.
 *
 * Describes the command, arguments, prompt delivery mode, output format, and
 * environment variables for a custom AI CLI backend. Used when the operator
 * wants to specify a backend beyond the built-in named backends (claude,
 * gemini, codex).
 */
export const BackendDescriptorSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  promptMode: PromptModeSchema,
  outputFormat: OutputFormatSchema,
  envVars: z.record(z.string(), z.string()).default({}),
});

/** Inferred TypeScript type for {@link BackendDescriptorSchema}. */
export type BackendDescriptorConfig = z.infer<typeof BackendDescriptorSchema>;

/**
 * Schema for the `backend` field on a hat definition.
 *
 * Accepts either a plain string (named backend like `'claude'`, `'gemini'`,
 * `'codex'`) or a full custom {@link BackendDescriptorSchema} object.
 */
export const BackendFieldSchema = z.union([
  z.string(),
  BackendDescriptorSchema,
]);

/** Inferred TypeScript type for {@link BackendFieldSchema}. */
export type BackendField = z.infer<typeof BackendFieldSchema>;
