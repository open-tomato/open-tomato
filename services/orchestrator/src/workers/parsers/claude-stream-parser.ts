/**
 * NDJSON parser for Claude CLI `stream-json` output format.
 *
 * Each line of Claude's stream-json output is a JSON object with a `type`
 * discriminator. This parser splits buffered output into lines, parses
 * each as JSON, and routes recognised events to the appropriate
 * {@link StreamHandler} callback. Unknown event shapes are silently
 * skipped to maintain forward-compatibility with future CLI versions.
 */

import type { CompletionMeta, StreamHandler } from '../stream-handler.js';

// ---------------------------------------------------------------------------
// Claude stream-json event types (discriminated union)
// ---------------------------------------------------------------------------

/** A text content block emitted by the assistant. */
interface TextBlock {
  readonly type: 'text';
  readonly text: string;
}

/** A tool invocation content block emitted by the assistant. */
interface ToolUseBlock {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

/** A tool result content block returned after tool execution. */
interface ToolResultBlock {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: unknown;
}

/** Discriminated union of content block types within a Claude event. */
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/** System-level event (e.g. initialization, API retry). */
interface SystemEvent {
  readonly type: 'system';
  readonly subtype?: string;
  readonly message?: string;
}

/** Assistant turn event containing content blocks and optional usage data. */
interface AssistantEvent {
  readonly type: 'assistant';
  readonly message?: {
    readonly content?: readonly ContentBlock[];
    readonly usage?: {
      readonly input_tokens?: number;
      readonly output_tokens?: number;
    };
  };
  readonly content_block?: ContentBlock;
}

/** User turn event containing content blocks. */
interface UserEvent {
  readonly type: 'user';
  readonly message?: {
    readonly content?: readonly ContentBlock[];
  };
  readonly content_block?: ContentBlock;
}

/** Final result event with completion metadata, usage, and cost. */
interface ResultEvent {
  readonly type: 'result';
  readonly subtype?: string;
  readonly result?: string;
  readonly duration_ms?: number;
  readonly duration_api_ms?: number;
  readonly is_error?: boolean;
  readonly num_turns?: number;
  readonly session_id?: string;
  readonly cost_usd?: number;
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
}

/** Discriminated union of all Claude stream-json event types. */
type ClaudeEvent = SystemEvent | AssistantEvent | UserEvent | ResultEvent;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringType(value: unknown): value is { type: string } {
  return isRecord(value) && typeof value['type'] === 'string';
}

function processContentBlock(block: ContentBlock, handler: StreamHandler): void {
  switch (block.type) {
    case 'text':
      handler.onText(block.text);
      break;
    case 'tool_use':
      handler.onToolCall(block.name, block.input);
      break;
    case 'tool_result':
      handler.onToolResult(block.tool_use_id, block.content);
      break;
    default:
      // Unknown content block type — skip for forward-compatibility.
      break;
  }
}

function processContentBlocks(
  blocks: readonly ContentBlock[] | undefined,
  handler: StreamHandler,
): void {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (hasStringType(block)) {
      processContentBlock(block as ContentBlock, handler);
    }
  }
}

function processEvent(event: ClaudeEvent, handler: StreamHandler): void {
  switch (event.type) {
    case 'system':
      // System events are informational; no handler callback needed.
      break;

    case 'assistant': {
      if (event.content_block && hasStringType(event.content_block)) {
        processContentBlock(event.content_block, handler);
      }
      processContentBlocks(event.message?.content, handler);
      break;
    }

    case 'user': {
      if (event.content_block && hasStringType(event.content_block)) {
        processContentBlock(event.content_block, handler);
      }
      processContentBlocks(event.message?.content, handler);
      break;
    }

    case 'result': {
      if (event.is_error && event.result) {
        handler.onError(new Error(event.result));
        return;
      }

      if (event.result) {
        handler.onText(event.result);
      }

      const meta: CompletionMeta = {
        durationMs: event.duration_ms ?? event.duration_api_ms ?? 0,
        inputTokens: event.usage?.input_tokens,
        outputTokens: event.usage?.output_tokens,
        cost: event.cost_usd,
      };
      handler.onComplete(meta);
      break;
    }
    default:
      // Unknown event type — skip for forward-compatibility.
      break;
  }
}

/**
 * Parse a complete Claude `stream-json` NDJSON buffer and route events to
 * the provided {@link StreamHandler}.
 *
 * Lines that fail JSON parsing or contain unrecognised event types are
 * silently skipped for forward-compatibility.
 */
export function parseClaudeStream(output: string, handler: StreamHandler): void {
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Malformed JSON line — skip silently.
      continue;
    }

    if (!hasStringType(parsed)) continue;

    // Forward-compatibility: pass all typed objects to processEvent.
    // Unknown event types hit the default branch and are silently skipped,
    // analogous to Rust serde's #[serde(other)] for unknown enum variants.
    processEvent(parsed as ClaudeEvent, handler);
  }
}

export type { ClaudeEvent, ContentBlock, TextBlock, ToolUseBlock, ToolResultBlock };
export type { SystemEvent, AssistantEvent, UserEvent, ResultEvent };
