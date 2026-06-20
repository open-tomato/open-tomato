/**
 * Appends a `## ROBOT GUIDANCE` section to the given prompt.
 *
 * @param prompt - The original prompt text.
 * @param guidance - The guidance content to inject (typically a numbered list
 *   produced by {@link GuidanceAccumulator.flush}).
 * @returns A new string with the guidance section appended.
 *
 * @example
 * ```typescript
 * const guidance = accumulator.flush(sessionId);
 * if (guidance) {
 *   prompt = injectGuidance(prompt, guidance);
 * }
 * // prompt now ends with:
 * // ## ROBOT GUIDANCE
 * // 1. Use the staging database
 * // 2. Skip email notifications
 * ```
 *
 * @see {@link GuidanceAccumulator} for producing the numbered guidance list.
 */
export function injectGuidance(prompt: string, guidance: string): string {
  return `${prompt}\n\n## ROBOT GUIDANCE\n${guidance}\n`;
}
