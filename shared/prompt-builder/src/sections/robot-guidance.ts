import type { PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 5 — Robot Guidance.
 *
 * Renders human guidance messages from {@link PromptContext.robotGuidance} as
 * a numbered list under a `## ROBOT GUIDANCE` heading.
 *
 * The caller is responsible for clearing `robotGuidance` after prompt assembly
 * so that guidance messages are not repeated on subsequent iterations.
 *
 * When `robotGuidance` is empty the section returns an empty string so the
 * block is omitted from the assembled prompt.
 *
 * @example
 * ```typescript
 * const section = new RobotGuidanceSection();
 * const output = section.render(context);
 * // ## ROBOT GUIDANCE
 * //
 * // 1. Focus on the authentication flow first.
 * // 2. Do not touch the database schema.
 * ```
 */
export class RobotGuidanceSection implements PromptSection {
  readonly name = 'robot-guidance';

  /**
   * Renders the robot guidance block given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered robot guidance block, or an empty string when
   *   `robotGuidance` is empty.
   */
  render(context: PromptContext): string {
    if (context.robotGuidance.length === 0) {
      return '';
    }

    const items = context.robotGuidance
      .map((msg, i) => `${i + 1}. ${msg}`)
      .join('\n');

    return `## ROBOT GUIDANCE\n\n${items}`;
  }
}
