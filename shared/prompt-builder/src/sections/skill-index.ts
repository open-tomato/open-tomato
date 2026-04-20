import type { PromptContext, PromptSection, SkillManifest } from '../types/index.js';

/**
 * Truncates a string to a single line by stripping everything after the first
 * newline character.
 *
 * @param text - The text to truncate.
 * @returns The first line of the text.
 */
function firstLine(text: string): string {
  const newlineIndex = text.indexOf('\n');
  return newlineIndex === -1
    ? text
    : text.slice(0, newlineIndex);
}

/**
 * Renders a single skill as a Markdown table row.
 *
 * @param skill - The skill manifest to render.
 * @returns A Markdown table row string.
 */
function renderSkillRow(skill: SkillManifest): string {
  return `| ${skill.id} | ${skill.name} | ${firstLine(skill.description)} |`;
}

/**
 * Section 3 — Skill Index.
 *
 * Renders a compact Markdown table listing every skill available in the current
 * prompt context. The table has three columns: **ID**, **Name**, and
 * **Description** (one-line). This gives the agent a quick reference to the
 * skills it can invoke without repeating the full documentation from Section 1.
 *
 * When no skills are present the section returns an empty string so the
 * section is omitted from the assembled prompt.
 *
 * @example
 * ```typescript
 * const section = new SkillIndexSection();
 * const output = section.render(context);
 * // ## SKILL INDEX
 * //
 * // | ID | Name | Description |
 * // | --- | --- | --- |
 * // | memory-data | Memory Data | Injects memory blocks into the prompt. |
 * ```
 */
export class SkillIndexSection implements PromptSection {
  readonly name = 'skill-index';

  /**
   * Renders the skill index table given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered skill index Markdown table, or an empty string when
   *   no skills are available.
   */
  render(context: PromptContext): string {
    if (context.skills.length === 0) {
      return '';
    }

    const header = '## SKILL INDEX';
    const tableHeader = '| ID | Name | Description |';
    const tableDivider = '| --- | --- | --- |';
    const rows = context.skills.map(renderSkillRow).join('\n');

    return [header, '', tableHeader, tableDivider, rows].join('\n');
  }
}
