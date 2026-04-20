import { z } from 'zod';

/**
 * Zod schema for a single hook specification entry.
 *
 * Defines the shell command to run, an optional timeout, failure behaviour,
 * and the list of events the hook publishes on success.
 */
export const HookSpecSchema = z.object({
  command: z.string(),
  timeout_ms: z.number().int()
    .positive()
    .optional(),
  on_failure: z.enum(['abort', 'warn', 'ignore']).default('warn'),
  /**
   * Event names this hook publishes to the orchestrator event bus after
   * executing successfully. Allowed only on **post-phase** hooks; hooks in
   * mutating (pre-execution) phases must leave this empty to prevent
   * recursive invocations and unexpected interleaving.
   */
  publishes: z.array(z.string()).default([]),
});

const phaseArray = () => z.array(HookSpecSchema).default([]);

/**
 * Zod schema for the `hooks` section of the core config.
 *
 * Each field corresponds to one of the 12 canonical orchestrator lifecycle
 * phases. All phase arrays default to empty.
 */
export const HooksSchema = z.object({
  // Session-level phases
  session_start: phaseArray(),
  session_end: phaseArray(),
  // Iteration-level phases
  pre_iteration: phaseArray(),
  post_iteration: phaseArray(),
  // Tool-level phases
  pre_tool_use: phaseArray(),
  post_tool_use: phaseArray(),
  post_tool_use_failure: phaseArray(),
  // Hat/agent-level phases
  pre_hat_activation: phaseArray(),
  post_hat_activation: phaseArray(),
  hat_activation_failure: phaseArray(),
  // Event-level phases
  event_published: phaseArray(),
  completion: phaseArray(),
});

/** Inferred TypeScript type for {@link HookSpecSchema}. */
export type HookSpec = z.infer<typeof HookSpecSchema>;
/** Inferred TypeScript type for {@link HooksSchema}. */
export type Hooks = z.infer<typeof HooksSchema>;
