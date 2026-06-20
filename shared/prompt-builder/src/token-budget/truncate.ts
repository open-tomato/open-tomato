import type { TokenCounter } from '../token-counter.js';

/**
 * Truncates `text` so that its token count does not exceed `maxTokens`.
 *
 * Truncation always happens at paragraph (double-newline) block boundaries so
 * the result never ends mid-sentence or mid-paragraph. Blocks are accumulated
 * greedily in order; the first block that would push the total over `maxTokens`
 * causes iteration to stop.
 *
 * If the entire text fits within the budget, it is returned unchanged.
 * If no block fits within the budget, an empty string is returned.
 *
 * @param text - The text to truncate.
 * @param maxTokens - Maximum number of tokens the result may contain (inclusive).
 * @param counter - {@link TokenCounter} used to measure token counts.
 * @returns The truncated text, always ending on a complete block boundary.
 *
 * @example
 * ```typescript
 * const counter = new TokenCounter();
 * const result = truncateToTokenBudget('Block one\n\nBlock two\n\nBlock three', 10, counter);
 * // result === 'Block one\n\nBlock two'  (assuming each block ≈ 3–4 tokens)
 * ```
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  counter: TokenCounter,
): string {
  if (counter.count(text) <= maxTokens) {
    return text;
  }

  const blocks = text.split('\n\n');
  let result = '';

  for (const block of blocks) {
    const candidate = result.length > 0
      ? `${result}\n\n${block}`
      : block;
    if (counter.count(candidate) > maxTokens) {
      break;
    }
    result = candidate;
  }

  return result;
}
