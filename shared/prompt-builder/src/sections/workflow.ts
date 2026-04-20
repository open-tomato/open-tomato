import type { PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 7 — Workflow.
 *
 * Renders the agent's workflow steps depending on how many hats are active:
 *
 * - **Multi-hat** (`activeHatIds.length > 1`): Renders the PLAN → DELEGATE
 *   workflow, which includes a fast-path hint for simple delegation tasks that
 *   do not require a separate planning step.
 * - **Solo** (`activeHatIds.length <= 1`): Renders the full
 *   STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT loop.
 *
 * @example
 * ```typescript
 * const section = new WorkflowSection();
 *
 * // Solo workflow
 * const solo = section.render({ ...context, activeHatIds: ['planner'] });
 * // ## WORKFLOW
 * // STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT
 * // ...
 *
 * // Multi-hat workflow
 * const multi = section.render({ ...context, activeHatIds: ['planner', 'coder'] });
 * // ## WORKFLOW
 * // PLAN → DELEGATE
 * // ...
 * ```
 */
export class WorkflowSection implements PromptSection {
  readonly name = 'workflow';

  /**
   * Renders the workflow block appropriate for the current hat topology.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered workflow block.
   */
  render(context: PromptContext): string {
    return context.activeHatIds.length > 1
      ? renderMultiHatWorkflow(context.activeHatIds)
      : renderSoloWorkflow();
  }
}

// ─── Workflow renderers ────────────────────────────────────────────────────────

/**
 * Renders the solo workflow steps (STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT).
 *
 * @returns The rendered solo workflow block.
 */
function renderSoloWorkflow(): string {
  return [
    '## WORKFLOW',
    '',
    'STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT',
    '',
    '1. **STUDY** — Read the objective and any pending events fully before acting.',
    '2. **PLAN** — Outline the steps you will take. Think before writing code.',
    '3. **IMPLEMENT** — Execute your plan one step at a time.',
    '4. **VERIFY** — Check your work against the objective and acceptance criteria.',
    '5. **REPEAT** — If verification fails, return to STUDY with new information.',
  ].join('\n');
}

/**
 * Renders the multi-hat workflow steps (PLAN → DELEGATE) including the list
 * of active hats available for delegation.
 *
 * @param activeHatIds - The ids of all currently active hats.
 * @returns The rendered multi-hat workflow block.
 */
function renderMultiHatWorkflow(activeHatIds: string[]): string {
  const delegationList = activeHatIds.map((id) => `- \`${id}\``).join('\n');

  return [
    '## WORKFLOW',
    '',
    'PLAN → DELEGATE',
    '',
    '1. **PLAN** — Decompose the objective into tasks, one per active hat.',
    '2. **DELEGATE** — Emit events to assign each task to the appropriate hat.',
    '',
    '**Fast path:** If the objective maps directly to a single well-defined task',
    'for one hat, skip decomposition and delegate immediately without a separate',
    'planning step.',
    '',
    'Active hats available for delegation:',
    '',
    delegationList,
  ].join('\n');
}
