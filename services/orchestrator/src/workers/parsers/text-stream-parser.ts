/**
 * Plain-text stream parser for backends that emit unstructured text output
 * (e.g. Gemini CLI, Codex CLI).
 *
 * Unlike the Claude NDJSON parser, plain-text backends provide no structured
 * events, tool calls, or usage metadata. This parser emits the entire
 * non-empty output as a single {@link StreamHandler.onText} call, followed
 * by an {@link StreamHandler.onComplete} with a duration-only
 * {@link CompletionMeta}.
 */

import type { CompletionMeta, StreamHandler } from '../stream-handler.js';

/**
 * Options for the text stream parser.
 */
export interface TextStreamParserOptions {
  /** Wall-clock duration of the backend invocation in milliseconds. */
  readonly durationMs?: number;
}

/**
 * Parse plain-text backend output and route it to the provided
 * {@link StreamHandler}.
 *
 * Empty or whitespace-only output is treated as a no-op: neither
 * {@link StreamHandler.onText} nor {@link StreamHandler.onComplete}
 * is called, since the backend produced no meaningful response.
 */
export function parseTextStream(
  output: string,
  handler: StreamHandler,
  options: TextStreamParserOptions = {},
): void {
  const trimmed = output.trim();
  if (trimmed === '') return;

  handler.onText(trimmed);

  const meta: CompletionMeta = {
    durationMs: options.durationMs ?? 0,
    inputTokens: undefined,
    outputTokens: undefined,
    cost: undefined,
  };
  handler.onComplete(meta);
}
