import type { SkillManifest } from '@open-tomato/types';

/**
 * Formats a {@link SkillManifest} as an XML-tagged block for injection into
 * Section 1 (Auto-Injected Skills) of the assembled prompt.
 *
 * The output format is:
 * ```
 * <xmlTag>
 * docs
 * </xmlTag>
 * ```
 *
 * @example
 * ```typescript
 * const formatter = new XmlSkillFormatter();
 * const output = formatter.format(skill);
 * // <memory-data>
 * // ...docs...
 * // </memory-data>
 * ```
 */
export class XmlSkillFormatter {
  /**
   * Wraps a skill's documentation in its corresponding XML tags.
   *
   * @param skill - The skill manifest to format.
   * @returns A string of the form `<xmlTag>\ndocs\n</xmlTag>`.
   */
  format(skill: SkillManifest): string {
    return `<${skill.xmlTag}>\n${skill.docs}\n</${skill.xmlTag}>`;
  }

  /**
   * Formats multiple skills as XML-tagged blocks joined by blank lines.
   *
   * Returns an empty string when the list is empty.
   *
   * @param skills - The skill manifests to format.
   * @returns The concatenated XML blocks separated by blank lines, or an empty
   *   string when `skills` is empty.
   */
  formatAll(skills: SkillManifest[]): string {
    if (skills.length === 0) {
      return '';
    }

    return skills.map((s) => this.format(s)).join('\n\n');
  }
}
