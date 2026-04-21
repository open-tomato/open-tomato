/**
 * @packageDocumentation
 * Zod schemas for the hook lifecycle system.
 *
 * Each schema validates the corresponding TypeScript interface defined in
 * `types.ts`. Types are inferred from the schemas so the two stay in sync.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive unions
// ---------------------------------------------------------------------------

/** Validates a {@link HookPhase} string — one of the 12 lifecycle point identifiers. */
export const hookPhaseSchema = z.enum([
  'pre.loop.start',
  'post.loop.start',
  'pre.iteration.start',
  'post.iteration.start',
  'pre.plan.created',
  'post.plan.created',
  'pre.human.interact',
  'post.human.interact',
  'pre.loop.complete',
  'post.loop.complete',
  'pre.loop.error',
  'post.loop.error',
]);

/** Validates a {@link HookOnError} value — the failure mode applied on non-zero exit. */
export const hookOnErrorSchema = z.enum(['warn', 'block', 'suspend']);

/** Validates a {@link HookSuspendMode} value — the recovery strategy used when suspended. */
export const hookSuspendModeSchema = z.enum([
  'WaitForResume',
  'RetryBackoff',
  'WaitThenRetry',
]);

// ---------------------------------------------------------------------------
// HookSpec
// ---------------------------------------------------------------------------

/**
 * Validates the configuration for a single hook.
 * `timeoutMs` and `on_error` are required; all other fields are optional.
 */
export const hookSpecSchema = z.object({
  /** Human-readable identifier used in logs and telemetry. */
  name: z.string().min(1),
  /** Executable command to spawn. */
  command: z.string().min(1),
  /** Optional arguments passed to the command. */
  args: z.array(z.string()).optional(),
  /** Working directory for the spawned process. */
  cwd: z.string().optional(),
  /** Additional environment variables merged into the spawned process env. */
  env: z.record(z.string(), z.string()).optional(),
  /** Maximum milliseconds to wait before sending SIGKILL. */
  timeoutMs: z.number().int()
    .positive(),
  /** Failure mode applied when the hook exits with a non-zero code. */
  on_error: hookOnErrorSchema,
  /** Recovery strategy used when `on_error` is `'suspend'`. */
  suspend_mode: hookSuspendModeSchema.optional(),
  /** When `enabled` is true, the hook's JSON stdout is merged into loop metadata. */
  mutate: z
    .object({
      enabled: z.boolean(),
    })
    .optional(),
  /** Maximum bytes to capture from stdout and stderr. Defaults to 65,536. */
  max_output_bytes: z.number().int()
    .positive()
    .optional(),
});

// ---------------------------------------------------------------------------
// HookPayload
// ---------------------------------------------------------------------------

/**
 * Validates the JSON payload delivered to a hook via stdin.
 */
export const hookPayloadSchema = z.object({
  /** Current loop iteration index (1-based). */
  iteration: z.number().int()
    .positive(),
  /** Identifier of the active hat (agent role or context). */
  hat: z.string().min(1),
  /** Sequence of events that have occurred in the current iteration. */
  events: z.array(z.unknown()),
  /** Accumulated metadata from prior hooks in the current phase chain. */
  metadata: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// HookResult
// ---------------------------------------------------------------------------

/** Validates the disposition string produced after a hook invocation. */
export const hookDispositionSchema = z.enum([
  'continue',
  'warn',
  'block',
  'suspend',
  'timeout',
]);

/**
 * Validates the result produced after a single hook invocation completes.
 */
export const hookResultSchema = z.object({
  /** Name of the hook that produced this result. */
  hookName: z.string().min(1),
  /** Lifecycle phase at which the hook was invoked. */
  phase: hookPhaseSchema,
  /** Process exit code, or null if the process was killed (e.g. timeout). */
  exitCode: z.number().int()
    .nullable(),
  /** Captured stdout, truncated at `max_output_bytes`. */
  stdout: z.string(),
  /** Captured stderr, truncated at `max_output_bytes`. */
  stderr: z.string(),
  /** Wall-clock duration of the hook invocation in milliseconds. */
  durationMs: z.number().nonnegative(),
  /** Orchestration action determined from the exit code and `on_error` mode. */
  disposition: hookDispositionSchema,
  /** Metadata patch parsed from stdout JSON when `mutate.enabled` is true. */
  mutationApplied: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Mutation output
// ---------------------------------------------------------------------------

/**
 * Validates the JSON object a hook may emit via stdout to mutate loop metadata.
 * Any key-value pairs are permitted; the object must be a plain record.
 */
export const hookMutationOutputSchema = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// SuspendState
// ---------------------------------------------------------------------------

/**
 * Validates persisted state written to disk when the orchestration loop is
 * suspended, used to recover execution at startup.
 */
export const suspendStateSchema = z.object({
  /** Lifecycle phase at which suspension occurred. */
  phase: hookPhaseSchema,
  /** Name of the hook that triggered suspension. */
  hookName: z.string().min(1),
  /** Payload that was active at the time of suspension. */
  payload: hookPayloadSchema,
  /** Recovery strategy to apply upon resume. */
  suspendMode: hookSuspendModeSchema,
  /** ISO 8601 timestamp of when the suspension was recorded. */
  suspendedAt: z.string().datetime(),
  /** Number of retry attempts made before this suspension was persisted. */
  retryCount: z.number().int()
    .nonnegative(),
});

// ---------------------------------------------------------------------------
// Inferred types (kept in sync with types.ts via schema inference)
// ---------------------------------------------------------------------------

/** TypeScript type inferred from {@link hookPhaseSchema}. */
export type HookPhaseSchema = z.infer<typeof hookPhaseSchema>;
/** TypeScript type inferred from {@link hookOnErrorSchema}. */
export type HookOnErrorSchema = z.infer<typeof hookOnErrorSchema>;
/** TypeScript type inferred from {@link hookSuspendModeSchema}. */
export type HookSuspendModeSchema = z.infer<typeof hookSuspendModeSchema>;
/** TypeScript type inferred from {@link hookSpecSchema}. */
export type HookSpecSchema = z.infer<typeof hookSpecSchema>;
/** TypeScript type inferred from {@link hookPayloadSchema}. */
export type HookPayloadSchema = z.infer<typeof hookPayloadSchema>;
/** TypeScript type inferred from {@link hookResultSchema}. */
export type HookResultSchema = z.infer<typeof hookResultSchema>;
/** TypeScript type inferred from {@link hookMutationOutputSchema}. */
export type HookMutationOutputSchema = z.infer<typeof hookMutationOutputSchema>;
/** TypeScript type inferred from {@link suspendStateSchema}. */
export type SuspendStateSchema = z.infer<typeof suspendStateSchema>;
