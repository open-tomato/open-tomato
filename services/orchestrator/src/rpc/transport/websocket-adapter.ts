/**
 * @packageDocumentation
 * WebSocket transport adapter for the RPC protocol layer.
 *
 * This module provides {@link WebSocketRpcAdapter}, an alternative transport
 * that wraps a standard `WebSocket` connection and satisfies the same
 * {@link RpcTransport} interface as the NDJSON stdin/stdout transport.
 *
 * **This is an alternative transport, not a replacement for the stdio path.**
 * The NDJSON transport remains the primary mechanism for local IPC. The
 * WebSocket adapter is intended for remote consumers such as web dashboards
 * and IDE integrations that connect over the network.
 *
 * The adapter uses JSON-serialized text frames (one event per message) rather
 * than newline-delimited framing, since WebSocket already provides message
 * boundaries.
 *
 * @example
 * ```ts
 * import { WebSocketRpcAdapter } from './websocket-adapter.js';
 *
 * const ws = new WebSocket('ws://localhost:8080');
 * const transport = new WebSocketRpcAdapter(ws);
 *
 * bus.subscribe((event) => transport.emit(event));
 *
 * for await (const command of transport.commands({
 *   onError: (err) => console.error(err.code, err.message),
 * })) {
 *   handler.dispatch(command);
 * }
 * ```
 */

import type { NdjsonParseError } from './ndjson-parser.js';
import type { RpcTransport, TransportParseOptions } from './rpc-transport.js';
import type { RpcCommand , RpcEvent } from '../types/index.js';

import { rpcCommandSchema } from '../types/commands.js';

/**
 * Minimal WebSocket interface consumed by the adapter.
 *
 * This is a subset of the standard `WebSocket` API so the adapter works with
 * any spec-compliant implementation (browser `WebSocket`, Bun's built-in
 * `WebSocket`, the `ws` package, etc.) without importing a specific library.
 */
export interface WebSocketLike {
  /** Send a text or binary message. */
  send(data: string | ArrayBuffer | Uint8Array): void;

  /** Register a handler for incoming messages. */
  addEventListener(
    type: 'message',
    listener: (event: { data: unknown }) => void,
  ): void;

  /** Register a handler for the close event. */
  addEventListener(type: 'close', listener: () => void): void;

  /** Register a handler for errors. */
  addEventListener(type: 'error', listener: (event: unknown) => void): void;

  /** Remove a previously registered handler. */
  removeEventListener(type: string, listener: (...args: never[]) => void): void;

  /** The current connection state. */
  readonly readyState: number;

  /** Close the connection. */
  close(code?: number, reason?: string): void;
}

/** WebSocket `readyState` value indicating the connection is open. */
const WS_OPEN = 1;

/**
 * Validates a raw WebSocket message payload and returns a parsed
 * {@link RpcCommand}, or `undefined` if the payload is invalid.
 */
function parseMessage(
  raw: unknown,
  onError?: (error: NdjsonParseError) => void,
): RpcCommand | undefined {
  const text = typeof raw === 'string'
    ? raw
    : String(raw);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    onError?.({
      code: 'PARSE_ERROR',
      message: `Invalid JSON: ${text.length > 200
        ? text.slice(0, 200) + '…'
        : text}`,
      timestamp: new Date().toISOString(),
      details: { rawLine: text },
    });
    return undefined;
  }

  const result = rpcCommandSchema.safeParse(json);
  if (!result.success) {
    onError?.({
      code: 'VALIDATION_ERROR',
      message: `Invalid RPC command: ${result.error.message}`,
      timestamp: new Date().toISOString(),
      details: { rawLine: text },
    });
    return undefined;
  }

  return result.data;
}

/**
 * WebSocket-based RPC transport adapter.
 *
 * Wraps a {@link WebSocketLike} connection and implements the
 * {@link RpcTransport} interface so it can be used interchangeably with
 * the NDJSON stdin/stdout transport.
 *
 * **Outbound events** are serialized with `JSON.stringify` and sent as text
 * frames — no newline delimiter is needed because WebSocket provides its own
 * message framing.
 *
 * **Inbound commands** are exposed through the {@link commands} async
 * iterable. Each text message is parsed as JSON and validated against the
 * {@link rpcCommandSchema}. Invalid messages are reported through the
 * optional `onError` callback and otherwise discarded.
 *
 * The adapter does **not** own the underlying WebSocket — calling
 * {@link close} marks the adapter as closed (preventing further
 * {@link emit} calls and ending the command iterable) but does not call
 * `ws.close()`. The caller retains ownership of the socket lifecycle.
 */
export class WebSocketRpcAdapter implements RpcTransport {
  private readonly ws: WebSocketLike;
  private closed = false;

  /**
   * Creates a new WebSocket transport adapter.
   *
   * @param ws - A spec-compliant WebSocket connection. The socket should
   *             already be in the `OPEN` state or the caller should wait
   *             for the `open` event before calling {@link emit}.
   */
  constructor(ws: WebSocketLike) {
    this.ws = ws;
  }

  /**
   * Serialize an {@link RpcEvent} to JSON and send it as a WebSocket text
   * frame.
   *
   * @param event - The RPC event to emit.
   * @returns `true` if the socket was open and the message was handed off
   *          to the WebSocket send buffer.
   * @throws If the adapter has been {@link close | closed}.
   */
  emit(event: RpcEvent): boolean {
    if (this.closed) {
      throw new Error('WebSocketRpcAdapter is closed');
    }
    if (this.ws.readyState !== WS_OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(event));
    return true;
  }

  /**
   * Return an async iterable that yields validated {@link RpcCommand}
   * objects received over the WebSocket connection.
   *
   * The iterable completes when:
   * - The WebSocket connection closes, or
   * - {@link close} is called on the adapter.
   *
   * @param options - Optional configuration including an `onError` callback
   *                  for malformed or invalid messages.
   */
  async *commands(
    options: TransportParseOptions = {},
  ): AsyncGenerator<RpcCommand> {
    const { onError } = options;

    // Build a queue that the message listener pushes into and the generator
    // pulls from. A sentinel `null` signals that the connection is done.
    const queue: (RpcCommand | null)[] = [];
    let resolve: (() => void) | undefined;

    const enqueue = (item: RpcCommand | null): void => {
      queue.push(item);
      resolve?.();
    };

    const onMessage = (event: { data: unknown }): void => {
      if (this.closed) return;
      const command = parseMessage(event.data, onError);
      if (command !== undefined) {
        enqueue(command);
      }
    };

    const onClose = (): void => {
      enqueue(null);
    };

    const onWsError = (event: unknown): void => {
      const message =
        event instanceof Error
          ? event.message
          : 'WebSocket error';

      onError?.({
        code: 'PARSE_ERROR',
        message: `WebSocket transport error: ${message}`,
        timestamp: new Date().toISOString(),
        details: { rawLine: '' },
      });

      // Terminate the command iterable — the connection is likely broken.
      enqueue(null);
    };

    this.ws.addEventListener('message', onMessage);
    this.ws.addEventListener('close', onClose);
    this.ws.addEventListener('error', onWsError);

    try {
      while (!this.closed) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolve = r;
          });
          resolve = undefined;
        }

        while (queue.length > 0) {
          const item = queue.shift()!;
          if (item === null) return;
          yield item;
        }
      }
    } finally {
      this.ws.removeEventListener(
        'message',
        onMessage as (...args: never[]) => void,
      );
      this.ws.removeEventListener(
        'close',
        onClose as (...args: never[]) => void,
      );
      this.ws.removeEventListener(
        'error',
        onWsError as (...args: never[]) => void,
      );
    }
  }

  /**
   * Mark the adapter as closed.
   *
   * Subsequent calls to {@link emit} will throw and the {@link commands}
   * iterable will complete on its next iteration.
   *
   * This does **not** call `ws.close()` — the caller retains ownership of
   * the underlying WebSocket and is responsible for closing it when
   * appropriate.
   */
  close(): void {
    this.closed = true;
  }
}
