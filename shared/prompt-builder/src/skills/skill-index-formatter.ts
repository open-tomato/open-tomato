import type { SkillManifest } from '@open-tomato/types';

/**
 * Truncates a string to its first line by stripping everything after the
 * first newline character.
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
 * Converts a list of {@link SkillManifest} entries into the compact Markdown
 * table used in Section 3 (Skill Index) of the assembled prompt.
 *
 * The table has three columns: **ID**, **Name**, and **Description**
 * (first line only). This gives the agent a quick reference to available
 * skills without repeating the full documentation from Section 1.
 *
 * @example
 * ```typescript
 * const formatter = new SkillIndexFormatter();
 * const output = formatter.format(skills);
 * // | ID | Name | Description |
 * // | --- | --- | --- |
 * // | memory-data | Memory Data | Injects memory blocks into the prompt. |
 * ```
 */
export class SkillIndexFormatter {
  /**
   * Formats a single skill as a Markdown table row.
   *
   * @param skill - The skill manifest to format.
   * @returns A Markdown table row string.
   */
  formatRow(skill: SkillManifest): string {
    return `| ${skill.id} | ${skill.name} | ${firstLine(skill.description)} |`;
  }

  /**
   * Converts a list of skills into a Markdown table including the header row
   * and divider.
   *
   * Returns an empty string when the list is empty so the section can be
   * omitted from the assembled prompt.
   *
   * @param skills - The skill manifests to format.
   * @returns The complete Markdown table string, or an empty string when
   *   `skills` is empty.
   */
  format(skills: SkillManifest[]): string {
    if (skills.length === 0) {
      return '';
    }

    const header = '| ID | Name | Description |';
    const divider = '| --- | --- | --- |';
    const rows = skills.map((s) => this.formatRow(s)).join('\n');

    return [header, divider, rows].join('\n');
  }
}
