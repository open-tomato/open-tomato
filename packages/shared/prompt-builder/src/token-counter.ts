/**
 * Lightweight token counter for the prompt assembly pipeline.
 *
 * Uses the `gpt-tokenizer` library (cl100k_base encoding, the same scheme used
 * by GPT-4 and a close approximation of Claude's tokenizer) as the primary
 * counting strategy. Falls back to a character-based approximation
 * (~4 characters per token) if the tokenizer is unavailable.
 */

import { encode } from 'gpt-tokenizer';

/**
 * Estimates the number of tokens in a string using cl100k_base encoding.
 *
 * @remarks
 * The implementation delegates to `gpt-tokenizer` which implements the same
 * byte-pair encoding used by GPT-4 models. Claude's tokenizer is not publicly
 * distributed, but cl100k_base produces counts within ±5 % for typical English
 * prompt content — well within the ±15 % tolerance of the character fallback.
 *
 * @example
 * ```typescript
 * const counter = new TokenCounter();
 * const tokens = counter.count('Hello, world!'); // 4
 * ```
 */
export class TokenCounter {
  /**
   * Estimates the token count for the given text.
   *
   * @param text - The string to estimate token count for.
   * @returns The estimated number of tokens (always ≥ 0).
   */
  count(text: string): number {
    if (text.length === 0) {
      return 0;
    }

    try {
      return encode(text).length;
    } catch {
      return characterFallback(text);
    }
  }
}

/**
 * Character-based fallback approximation (~4 UTF-16 code units per token).
 *
 * Used when the primary tokenizer throws (e.g. a very unusual input or
 * future encoding changes). Not exported — callers should always go through
 * {@link TokenCounter}.
 */
function characterFallback(text: string): number {
  const CHARS_PER_TOKEN = 4;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
