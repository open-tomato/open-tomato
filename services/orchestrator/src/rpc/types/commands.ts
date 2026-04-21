/**
 * @packageDocumentation
 * Zod schemas and inferred TypeScript types for all RPC commands.
 *
 * Commands flow from external consumers (TUI, web dashboard, IDE) into the
 * orchestrator over the NDJSON transport. Each command is a discriminated
 * union member keyed by the `method` field.
 */

import { z } from 'zod';

import { guidanceAppliesToSchema, hatIdSchema } from './shared.js';

// ---------------------------------------------------------------------------
// Per-method param schemas
// ---------------------------------------------------------------------------

/** Params for the `prompt` command — starts a new orchestration run. */
export const promptParamsSchema = z.object({
  /** The user prompt to execute. */
  text: z.string().min(1),
  /** Optional hat to activate for this prompt. */
  hat: hatIdSchema.optional(),
  /** Optional maximum number of iterations before auto-termination. */
  maxIterations: z.number().int()
    .positive()
    .optional(),
});

/** Params for the `guidance` command — injects advisory context into the active run. */
export const guidanceParamsSchema = z.object({
  /** Free-form guidance text appended to the next iteration context. */
  text: z.string().min(1),
  /** Scope of the guidance: current iteration only or all remaining. */
  appliesTo: guidanceAppliesToSchema.default('remaining'),
});

/** Params for the `steer` command — overrides the orchestrator's next action. */
export const steerParamsSchema = z.object({
  /** Directive that replaces the orchestrator's planned next step. */
  directive: z.string().min(1),
  /** When true, the directive is treated as a hard override rather than a suggestion. */
  force: z.boolean().default(false),
});

/** Params for the `follow_up` command — appends a follow-up message to the active run. */
export const followUpParamsSchema = z.object({
  /** The follow-up text to append. */
  text: z.string().min(1),
});

/** Params for the `abort` command — terminates the active orchestration run. */
export const abortParamsSchema = z.object({
  /** Human-readable reason for aborting (included in the `loop_terminated` event). */
  reason: z.string().optional(),
});

/** Params for the `get_iterations` command — retrieves iteration history. */
export const getIterationsParamsSchema = z.object({
  /** Return only iterations after this 0-based index (inclusive). */
  after: z.number().int()
    .nonnegative()
    .optional(),
  /** Maximum number of iterations to return. */
  limit: z.number().int()
    .positive()
    .optional(),
});

/** Params for the `set_hat` command — switches the active hat mid-run. */
export const setHatParamsSchema = z.object({
  /** Identifier of the hat to activate. */
  hatId: hatIdSchema,
});

// ---------------------------------------------------------------------------
// Individual command schemas (discriminated by `method`)
// ---------------------------------------------------------------------------

/** Schema for the `prompt` command. */
export const promptCommandSchema = z.object({
  method: z.literal('prompt'),
  params: promptParamsSchema,
});

/** Schema for the `guidance` command. */
export const guidanceCommandSchema = z.object({
  method: z.literal('guidance'),
  params: guidanceParamsSchema,
});

/** Schema for the `steer` command. */
export const steerCommandSchema = z.object({
  method: z.literal('steer'),
  params: steerParamsSchema,
});

/** Schema for the `follow_up` command. */
export const followUpCommandSchema = z.object({
  method: z.literal('follow_up'),
  params: followUpParamsSchema,
});

/** Schema for the `abort` command. */
export const abortCommandSchema = z.object({
  method: z.literal('abort'),
  params: abortParamsSchema,
});

/** Schema for the `get_state` command — takes no params. */
export const getStateCommandSchema = z.object({
  method: z.literal('get_state'),
});

/** Schema for the `get_iterations` command. */
export const getIterationsCommandSchema = z.object({
  method: z.literal('get_iterations'),
  params: getIterationsParamsSchema,
});

/** Schema for the `set_hat` command. */
export const setHatCommandSchema = z.object({
  method: z.literal('set_hat'),
  params: setHatParamsSchema,
});

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/**
 * Discriminated union schema for all RPC commands.
 *
 * The `method` field acts as the discriminant. Use `rpcCommandSchema.parse()`
 * to validate and narrow incoming NDJSON messages.
 */
export const rpcCommandSchema = z.discriminatedUnion('method', [
  promptCommandSchema,
  guidanceCommandSchema,
  steerCommandSchema,
  followUpCommandSchema,
  abortCommandSchema,
  getStateCommandSchema,
  getIterationsCommandSchema,
  setHatCommandSchema,
]);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

/** Params for the `prompt` command. */
export type PromptParams = z.infer<typeof promptParamsSchema>;
/** Params for the `guidance` command. */
export type GuidanceParams = z.infer<typeof guidanceParamsSchema>;
/** Params for the `steer` command. */
export type SteerParams = z.infer<typeof steerParamsSchema>;
/** Params for the `follow_up` command. */
export type FollowUpParams = z.infer<typeof followUpParamsSchema>;
/** Params for the `abort` command. */
export type AbortParams = z.infer<typeof abortParamsSchema>;
/** Params for the `get_iterations` command. */
export type GetIterationsParams = z.infer<typeof getIterationsParamsSchema>;
/** Params for the `set_hat` command. */
export type SetHatParams = z.infer<typeof setHatParamsSchema>;

/**
 * A `prompt` command — starts a new orchestration run.
 *
 * Discriminant: `method: 'prompt'`
 *
 * @see {@link PromptParams} for the parameter shape.
 */
export type PromptCommand = z.infer<typeof promptCommandSchema>;

/**
 * A `guidance` command — injects advisory context into the active run.
 *
 * Discriminant: `method: 'guidance'`
 *
 * @see {@link GuidanceParams} for the parameter shape.
 */
export type GuidanceCommand = z.infer<typeof guidanceCommandSchema>;

/**
 * A `steer` command — overrides the orchestrator's next action.
 *
 * Discriminant: `method: 'steer'`
 *
 * @see {@link SteerParams} for the parameter shape.
 */
export type SteerCommand = z.infer<typeof steerCommandSchema>;

/**
 * A `follow_up` command — appends a follow-up message to the active run.
 *
 * Discriminant: `method: 'follow_up'`
 *
 * @see {@link FollowUpParams} for the parameter shape.
 */
export type FollowUpCommand = z.infer<typeof followUpCommandSchema>;

/**
 * An `abort` command — terminates the active orchestration run.
 *
 * Discriminant: `method: 'abort'`
 *
 * @see {@link AbortParams} for the parameter shape.
 */
export type AbortCommand = z.infer<typeof abortCommandSchema>;

/**
 * A `get_state` command — requests a synchronous state snapshot.
 *
 * Discriminant: `method: 'get_state'`
 *
 * This command takes no parameters.
 */
export type GetStateCommand = z.infer<typeof getStateCommandSchema>;

/**
 * A `get_iterations` command — retrieves iteration history.
 *
 * Discriminant: `method: 'get_iterations'`
 *
 * @see {@link GetIterationsParams} for the parameter shape.
 */
export type GetIterationsCommand = z.infer<typeof getIterationsCommandSchema>;

/**
 * A `set_hat` command — switches the active hat mid-run.
 *
 * Discriminant: `method: 'set_hat'`
 *
 * @see {@link SetHatParams} for the parameter shape.
 */
export type SetHatCommand = z.infer<typeof setHatCommandSchema>;

/**
 * Discriminated union type for all RPC commands.
 *
 * The `method` field narrows the type:
 * ```ts
 * if (cmd.method === 'prompt') {
 *   cmd.params.text; // string
 * }
 * ```
 */
export type RpcCommand = z.infer<typeof rpcCommandSchema>;

/** All valid command method names. */
export type RpcCommandMethod = RpcCommand['method'];
