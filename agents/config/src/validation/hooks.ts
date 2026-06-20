import type { HookSpec, Hooks } from '../types.js';

import { ConfigSemanticError } from '../errors.js';

/**
 * Public alias for the hooks section of a `CoreConfig`, used as the parameter
 * type for `validateHooks` so callers do not need to import the full config.
 */
export type HooksConfig = Hooks;

/**
 * The 12 canonical hook phase keys recognised by the orchestrator runtime.
 * Any key present in a `HooksConfig` object that is not in this set is an
 * error — it indicates either a typo or an unsupported lifecycle point.
 */
const CANONICAL_HOOK_PHASES = new Set<string>([
  'session_start',
  'session_end',
  'pre_iteration',
  'post_iteration',
  'pre_tool_use',
  'post_tool_use',
  'post_tool_use_failure',
  'pre_hat_activation',
  'post_hat_activation',
  'hat_activation_failure',
  'event_published',
  'completion',
]);

/**
 * Pre-execution phases whose hooks run **before** the associated action and
 * can abort or modify it. Hooks registered in these phases must not publish
 * new events to the orchestrator event bus to prevent recursive invocations
 * and unexpected interleaving between pending actions and newly emitted events.
 *
 * Only post-execution phases (post_iteration, post_tool_use,
 * post_hat_activation, etc.) are permitted to publish.
 */
const MUTATING_PHASES = new Set<string>([
  'pre_iteration',
  'pre_tool_use',
  'pre_hat_activation',
]);

/**
 * Validates the `hooks` section of a `CoreConfig` against two contracts:
 *
 * 1. **Canonical phase keys** — every key in the `hooks` object must be one of
 *    the 12 recognised phase names. Unknown keys indicate typos or unsupported
 *    lifecycle points.
 *
 * 2. **Mutation contract** — hooks registered in mutating (pre-execution)
 *    phases (`pre_iteration`, `pre_tool_use`, `pre_hat_activation`) must not
 *    declare a non-empty `publishes` list. Pre-phase hooks run before the
 *    associated action is committed; allowing them to publish new events could
 *    cause recursive invocations or race conditions with the pending action.
 *    Event publishing must be deferred to the corresponding post-phase hook.
 *
 * @param hooks - The hooks section extracted from a validated `CoreConfig`.
 * @throws {ConfigSemanticError} When any of the above contracts is violated.
 */
export function validateHooks(hooks: HooksConfig): void {
  validateCanonicalPhaseKeys(hooks);
  validateMutationContract(hooks);
}

/**
 * Checks that every key in the `hooks` map is one of the 12 canonical phase
 * names. Zod strips unknown keys during schema parsing, so this guard exists
 * to catch configurations loaded through paths that bypass strict Zod parsing.
 */
function validateCanonicalPhaseKeys(hooks: HooksConfig): void {
  const unknownPhases = Object.keys(hooks).filter(
    (key) => !CANONICAL_HOOK_PHASES.has(key),
  );

  if (unknownPhases.length > 0) {
    throw new ConfigSemanticError(
      `hooks contains unknown phase key(s): ${unknownPhases.map((k) => `"${k}"`).join(', ')}. ` +
        `Valid phases are: ${[...CANONICAL_HOOK_PHASES].join(', ')}`,
    );
  }
}

/**
 * Enforces the mutation contract: hooks in pre-execution phases must have an
 * empty (or absent) `publishes` list.
 */
function validateMutationContract(hooks: HooksConfig): void {
  for (const phase of MUTATING_PHASES) {
    const specs = (hooks as Record<string, HookSpec[]>)[phase] ?? [];

    for (const spec of specs) {
      if (spec.publishes.length > 0) {
        throw new ConfigSemanticError(
          `hooks.${phase}: mutating-phase hooks must not publish events, ` +
            `but a hook with command "${spec.command}" declares publishes: ` +
            `[${spec.publishes.map((e) => `"${e}"`).join(', ')}]. ` +
            `Move event publishing to a post-phase hook instead (e.g. post_${phase.replace('pre_', '')}).`,
        );
      }
    }
  }
}
