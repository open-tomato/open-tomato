/**
 * Stream event handler interface and completion metadata.
 *
 * `StreamHandler` defines the callbacks that stream parsers invoke as they
 * decode backend output (NDJSON, plain text, etc.). Each parser routes
 * parsed events to the appropriate handler method, keeping the parsing
 * logic decoupled from the consumer.
 *
 * `CompletionMeta` carries optional usage/cost data emitted by some
 * backends at the end of a response.
 */

/** Metadata emitted when a backend stream completes. */
export interface CompletionMeta {
  /** Wall-clock duration of the backend invocation in milliseconds. */
  readonly durationMs: number;

  /** Number of input tokens consumed (when reported by the backend). */
  readonly inputTokens?: number;

  /** Number of output tokens generated (when reported by the backend). */
  readonly outputTokens?: number;

  /** Estimated cost in USD (when reported by the backend). */
  readonly cost?: number;
}

/** Callbacks invoked by stream parsers as backend output is decoded. */
export interface StreamHandler {
  /** Called for each text fragment emitted by the backend. */
  onText(text: string): void;

  /** Called when the backend initiates a tool call. */
  onToolCall(name: string, input: unknown): void;

  /** Called when a tool result is received. */
  onToolResult(toolUseId: string, content: unknown): void;

  /** Called when the backend reports an error mid-stream. */
  onError(error: Error): void;

  /** Called once when the stream ends successfully. */
  onComplete(meta: CompletionMeta): void;
}
