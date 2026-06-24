import type { MarkdownMemoryStore } from './store.js';
import type { InjectionConfig, Memory } from './types.js';

import { filterMemories } from './filter.js';

/**
 * Estimates the number of tokens in a text string using the 4-chars-per-token heuristic.
 *
 * This is an approximation based on the commonly observed average of ~4 characters per
 * token in LLM tokenizers. It is intentionally simple and does not require a tokenizer
 * dependency. Use it for budget calculations where exact token counts are not required.
 *
 * @param text - The text to estimate token count for.
 * @returns The estimated number of tokens, rounded up to the nearest integer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Formats an array of {@link Memory} objects into a prompt-injectable markdown block.
 *
 * The output begins with a `## Agent Memories` header, followed by each memory
 * rendered as a blockquote. A `Tags:` annotation line is appended inside the
 * blockquote when the memory has at least one tag. Memory blocks are separated
 * by a blank line to allow {@link truncateToBudget} to cut at block boundaries.
 *
 * @example
 * ```
 * ## Agent Memories
 *
 * > Use Drizzle ORM for schema migrations.
 * > Tags: orm, database
 *
 * > Always validate at system boundaries.
 * > Tags: validation
 * ```
 *
 * @param memories - The memories to format. May be empty.
 * @returns A markdown string ready for prompt injection, or an empty string when
 *   `memories` is empty.
 */
export function formatMemoriesAsMarkdown(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const blocks: string[] = [];

  for (const memory of memories) {
    const contentLines = memory.content
      .split('\n')
      .map((line) => (line === ''
        ? '>'
        : `> ${line}`));

    if (memory.tags.length > 0) {
      contentLines.push(`> Tags: ${memory.tags.join(', ')}`);
    }

    blocks.push(contentLines.join('\n'));
  }

  return `## Agent Memories\n\n${blocks.join('\n\n')}`;
}

const TRUNCATION_NOTICE = '<!-- memories truncated to fit token budget -->';

/**
 * Truncates a formatted memory string to fit within a token budget, cutting only
 * at memory block boundaries.
 *
 * A **memory block boundary** is defined as a blank line (`\n\n`) immediately before
 * a new blockquote line starting with `>`. This ensures that individual memory blocks
 * are never split mid-block — the cut always happens between two complete blocks.
 *
 * When truncation occurs, a truncation notice is appended to signal that some memories
 * were omitted: `<!-- memories truncated to fit token budget -->`.
 *
 * When no blocks fit within the budget, only the truncation notice is returned.
 *
 * @param content - The memory string to truncate (typically produced by
 *   {@link formatMemoriesAsMarkdown}).
 * @param budgetTokens - The maximum number of tokens allowed in the output,
 *   including the truncation notice when present.
 * @returns The content truncated at a block boundary, with the truncation notice
 *   appended if any content was removed. Returns the original string unchanged when
 *   it fits within the budget.
 */
export function truncateToBudget(content: string, budgetTokens: number): string {
  if (estimateTokens(content) <= budgetTokens) {
    return content;
  }

  const noticeWithNewline = `\n${TRUNCATION_NOTICE}`;
  const noticeTokens = estimateTokens(noticeWithNewline);
  const available = budgetTokens - noticeTokens;

  // Split at all \n\n boundaries; only cut before segments starting with >
  const segments = content.split('\n\n');
  let result = '';

  for (const segment of segments) {
    const isBlockBoundary = segment.startsWith('>');
    const separator = result === ''
      ? ''
      : '\n\n';
    const candidate = result + separator + segment;

    if (estimateTokens(candidate) <= available) {
      result = candidate;
    } else if (isBlockBoundary) {
      // Can only cut before a > block — stop here
      break;
    } else {
      // Non-block segment (e.g. header) that doesn't fit: include it anyway
      // since it precedes the first block and the notice will still be appended
      result = candidate;
    }
  }

  if (result === '' || result === segments[0]) {
    // Nothing meaningful fits (or only the header with no blocks)
    return TRUNCATION_NOTICE;
  }

  return result + noticeWithNewline;
}

/**
 * Builds a prompt string with relevant memories prepended, subject to a token budget.
 *
 * When `config.mode` is `'off'`, returns `basePrompt` unchanged without reading
 * from the store. When `config.mode` is `'auto'`, all memories are read from
 * `store`, optionally filtered via `config.filter`, formatted as a markdown
 * block, truncated to `config.budgetTokens`, and prepended to `basePrompt`
 * with a blank line separator (`\n\n`). If the store is empty (or the filter
 * matches no memories), `basePrompt` is returned unchanged.
 *
 * @param basePrompt - The original prompt to inject memories into.
 * @param store - The memory store to read from.
 * @param config - Controls injection mode, token budget, and optional filtering.
 * @returns The prompt with memories prepended, or `basePrompt` unchanged when
 *   mode is `'off'` or no memories match.
 */
export async function buildPromptWithMemories(
  basePrompt: string,
  store: MarkdownMemoryStore,
  config: InjectionConfig,
): Promise<string> {
  if (config.mode === 'off') {
    return basePrompt;
  }

  const all = await store.readAll();
  const filtered = config.filter !== undefined
    ? filterMemories(all, config.filter)
    : all;

  const formatted = formatMemoriesAsMarkdown(filtered);
  if (formatted === '') {
    return basePrompt;
  }

  const truncated = truncateToBudget(formatted, config.budgetTokens);
  return `${truncated}\n\n${basePrompt}`;
}
