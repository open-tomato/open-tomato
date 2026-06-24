import type { PromptContext, PromptSection, SkillManifest } from '../types/index.js';

/**
 * Renders an individual skill as an XML-tagged block.
 *
 * @param skill - The skill manifest to render.
 * @returns A string of the form `<xmlTag>\ndocs\n</xmlTag>`.
 */
function renderSkillBlock(skill: SkillManifest): string {
  return `<${skill.xmlTag}>\n${skill.docs}\n</${skill.xmlTag}>`;
}

/**
 * Section 1 — Auto-Injected Skills.
 *
 * Renders each skill from {@link PromptContext.skills} as an XML-tagged block
 * (using the skill's `xmlTag` field) so the agent can reference memory data,
 * tool documentation, the robot-interaction skill, and any custom skills
 * without consuming the conversational context window.
 *
 * Returns an empty string when no skills are present.
 *
 * @example
 * ```typescript
 * const section = new AutoInjectedSkillsSection();
 * const output = section.render(context);
 * // <memory-data>
 * // ...docs...
 * // </memory-data>
 * //
 * // <tool-docs>
 * // ...docs...
 * // </tool-docs>
 * ```
 */
export class AutoInjectedSkillsSection implements PromptSection {
  readonly name = 'auto-injected-skills';

  /**
   * Renders all skills from the context as XML-tagged blocks.
   *
   * @param context - The current prompt assembly context.
   * @returns The concatenated skill blocks joined by blank lines, or an empty
   *   string when `context.skills` is empty.
   */
  render(context: PromptContext): string {
    if (context.skills.length === 0) {
      return '';
    }

    return context.skills.map(renderSkillBlock).join('\n\n');
  }
}
