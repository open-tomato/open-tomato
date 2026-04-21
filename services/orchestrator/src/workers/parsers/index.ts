/**
 * Stream parser selection based on backend output format.
 *
 * Maps each {@link OutputFormat} to the appropriate parser function so that
 * the {@link FallbackChainWorkerClient} can decode backend output without
 * knowing the specific format at compile time.
 */

import type { OutputFormat } from '../backend-descriptor.js';
import type { StreamHandler } from '../stream-handler.js';

import { parseClaudeStream } from './claude-stream-parser.js';
import { parseTextStream } from './text-stream-parser.js';

/**
 * A normalised parser function that takes raw backend output and routes
 * decoded events to the provided {@link StreamHandler}.
 */
export type StreamParserFn = (output: string, handler: StreamHandler) => void;

/**
 * Returns the appropriate stream parser for the given output format.
 *
 * - `'stream-json'` → Claude NDJSON parser
 * - `'text'` → plain-text passthrough parser
 * - `'pi-stream-json'` / `'acp'` → plain-text parser (placeholder until
 *   dedicated parsers are implemented)
 */
export function selectStreamParser(format: OutputFormat): StreamParserFn {
  switch (format) {
    case 'stream-json':
      return parseClaudeStream;

    case 'text':
    case 'pi-stream-json':
    case 'acp':
      return parseTextStream;
  }
}
