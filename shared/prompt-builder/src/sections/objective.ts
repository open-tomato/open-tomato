import type { PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 4 — Objective.
 *
 * Renders the user's original objective from {@link PromptContext.objective}.
 * This value is set once at the start of a session and persists unchanged
 * across every iteration of the prompt assembly loop — it must never be
 * cleared or mutated between builds.
 *
 * When the objective is an empty string the section returns an empty string
 * so the block is omitted from the assembled prompt.
 *
 * @example
 * ```typescript
 * const section = new ObjectiveSection();
 * const output = section.render(context);
 * // ## OBJECTIVE
 * //
 * // Implement a REST API for user authentication.
 * ```
 */
export class ObjectiveSection implements PromptSection {
  readonly name = 'objective';

  /**
   * Renders the objective block given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered objective block, or an empty string when the
   *   objective is empty.
   */
  render(context: PromptContext): string {
    if (!context.objective) {
      return '';
    }

    return `## OBJECTIVE\n\n${context.objective}`;
  }
}
