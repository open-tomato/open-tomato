/**
 * @packageDocumentation
 * A {@link StreamHandler} implementation that publishes streaming RPC events
 * (`text_delta`, `tool_call_start`, `tool_call_end`) to an {@link RpcEventBus}.
 *
 * This handler bridges the stream parser output to the RPC protocol layer,
 * allowing external consumers (TUI, web dashboard, IDE) to observe LLM
 * output in real time.
 */

import type { RpcEventBus } from './event-bus.js';
import type {
  TextDeltaEvent,
  ToolCallEndEvent,
  ToolCallStartEvent,
} from './types/events.js';
import type { CompletionMeta, StreamHandler } from '../workers/stream-handler.js';

/**
 * Configuration for constructing an {@link RpcStreamHandler}.
 */
export interface RpcStreamHandlerOptions {
  /** The event bus to publish streaming events to. */
  readonly bus: RpcEventBus;
  /** Zero-based iteration index for the current iteration. */
  readonly iterationIndex: number;
}

/**
 * Tracks an in-flight tool call so that `tool_call_end` can be correlated
 * with its matching `tool_call_start` and include timing data.
 */
interface PendingToolCall {
  readonly callId: string;
  readonly toolName: string;
  readonly startMs: number;
}

/**
 * A {@link StreamHandler} that publishes `text_delta`, `tool_call_start`,
 * and `tool_call_end` events to an {@link RpcEventBus}.
 *
 * Tool calls are tracked with sequential IDs (`tool-0`, `tool-1`, ...)
 * and correlated using a FIFO queue: each `onToolCall` pushes a pending
 * entry, and each `onToolResult` pops the oldest one to emit `tool_call_end`.
 */
export class RpcStreamHandler implements StreamHandler {
  private readonly bus: RpcEventBus;
  private readonly iterationIndex: number;
  private toolCounter = 0;
  private readonly pendingCalls: PendingToolCall[] = [];

  constructor(options: RpcStreamHandlerOptions) {
    this.bus = options.bus;
    this.iterationIndex = options.iterationIndex;
  }

  /** Publishes a `text_delta` event for each text fragment. */
  onText(text: string): void {
    const evt: TextDeltaEvent = {
      event: 'text_delta',
      data: {
        delta: text,
        iterationIndex: this.iterationIndex,
      },
    };
    this.bus.publish(evt);
  }

  /** Publishes a `tool_call_start` event and records the call for later correlation. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onToolCall(name: string, _input: unknown): void {
    const callId = `tool-${this.toolCounter++}`;
    const now = Date.now();

    this.pendingCalls.push({ callId, toolName: name, startMs: now });

    const evt: ToolCallStartEvent = {
      event: 'tool_call_start',
      data: {
        callId,
        toolName: name,
        iterationIndex: this.iterationIndex,
        timestamp: new Date(now).toISOString(),
      },
    };
    this.bus.publish(evt);
  }

  /**
   * Publishes a `tool_call_end` event by popping the oldest pending call.
   * If no pending call exists (e.g. orphaned result), a synthetic entry is
   * created so the event is never silently dropped.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onToolResult(_toolUseId: string, _content: unknown): void {
    const now = Date.now();
    const pending = this.pendingCalls.shift();

    const callId = pending?.callId ?? `tool-orphan-${this.toolCounter++}`;
    const toolName = pending?.toolName ?? 'unknown';
    const durationMs = pending
      ? now - pending.startMs
      : 0;

    const evt: ToolCallEndEvent = {
      event: 'tool_call_end',
      data: {
        callId,
        toolName,
        iterationIndex: this.iterationIndex,
        success: true,
        durationMs,
        timestamp: new Date(now).toISOString(),
      },
    };
    this.bus.publish(evt);
  }

  /** No-op — errors are handled at a higher level by the runner. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onError(_error: Error): void {
    // Intentionally empty: stream-level errors are already handled by
    // the runner's exit-code logic and published as iteration_end events.
  }

  /** No-op — completion is handled at a higher level by the runner. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onComplete(_meta: CompletionMeta): void {
    // Intentionally empty: the runner publishes iteration_end with
    // duration data from its own timer.
  }
}
