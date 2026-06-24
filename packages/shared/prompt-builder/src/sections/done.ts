import type { PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 10 — Done.
 *
 * Renders completion instructions and a task verification checklist that the
 * agent MUST work through before declaring a task complete. The checklist
 * covers:
 *
 * - All acceptance criteria from the objective have been met
 * - No pending events remain unhandled
 * - All emitted events conform to event-writing rules
 * - Any artefacts or side effects are documented
 * - A brief summary of what was done and why is ready to report
 *
 * This section never returns an empty string — it is unconditionally included
 * in every assembled prompt as the terminal anchor of the pipeline.
 *
 * @example
 * ```typescript
 * const section = new DoneSection();
 * const output = section.render(context);
 * // ## DONE
 * //
 * // Before marking this task complete, verify each item in the checklist
 * // below. Do NOT declare done until every box can be ticked.
 * // ...
 * ```
 */
export class DoneSection implements PromptSection {
  readonly name = 'done';

  /**
   * Renders the completion instructions and task verification checklist.
   *
   * The output is identical for every context because this section contains
   * static completion invariants, not context-derived content.
   *
   * @param _context - Unused; accepted to satisfy the {@link PromptSection}
   *   interface.
   * @returns The rendered done block.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_context: PromptContext): string {
    return DONE_BLOCK;
  }
}

const DONE_BLOCK = `## DONE

Before marking this task complete, verify each item in the checklist below. Do NOT declare done until every box can be ticked.

### Task Verification Checklist

- [ ] **Objective met** — Every acceptance criterion stated in the OBJECTIVE section has been satisfied. No criterion is partially met or deferred without explicit justification.
- [ ] **No unhandled events** — The PENDING EVENTS list has been fully processed. Every event listed has been handled or delegated to the appropriate hat. No event has been silently dropped.
- [ ] **Event conformance** — All events emitted during this task comply with the EVENT WRITING rules. Every emitted event carries a unique \`id\`, was published to an authorised topic, and was emitted only after its producing action completed.
- [ ] **Artefacts documented** — Any files created, modified, or deleted, and any external side effects triggered (API calls, messages sent, state written) have been noted in your scratchpad or included in the completion summary.
- [ ] **Completion summary ready** — You can state in one or two sentences: what you did, and why it satisfies the objective. If you cannot state this clearly, the task is not done yet.

### Completion Instructions

1. Work through the checklist above in order. If any item cannot be ticked, continue working until it can.
2. Once all items are ticked, emit a \`task.completed\` event on your hat's designated completion topic with a payload containing:
   - \`objectiveSummary\`: a one-sentence restatement of the objective
   - \`completionSummary\`: a one-to-two-sentence description of what was done
   - \`artefacts\`: an array of any created or modified artefact references (may be empty)
3. Do not emit any further events after \`task.completed\` unless a new objective is provided.`;
