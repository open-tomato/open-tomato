/**
 * @packageDocumentation
 * NDJSON transport that combines {@link NdjsonEmitter} and
 * {@link parseNdjsonStream} behind the unified {@link RpcTransport} interface.
 *
 * This allows {@link RpcServer} to consume either the stdio-based NDJSON
 * transport or the {@link WebSocketRpcAdapter} without modification.
 *
 * @example
 * ```ts
 * import { NdjsonTransport } from './ndjson-transport.js';
 *
 * const transport = new NdjsonTransport(process.stdin, process.stdout);
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

import type { RpcTransport, TransportParseOptions } from './rpc-transport.js';
import type { RpcCommand, RpcEvent } from '../types/index.js';
import type { Readable, Writable } from 'node:stream';

import { NdjsonEmitter } from './ndjson-emitter.js';
import { parseNdjsonStream } from './ndjson-parser.js';

/**
 * NDJSON-based RPC transport for stdin/stdout communication.
 *
 * Wraps a {@link Readable} input stream and a {@link Writable} output stream,
 * delegating to {@link NdjsonEmitter} for outbound events and
 * {@link parseNdjsonStream} for inbound commands. Satisfies the
 * {@link RpcTransport} interface so it can be used interchangeably with
 * {@link WebSocketRpcAdapter}.
 *
 * The transport does **not** own the underlying streams — calling
 * {@link close} prevents further {@link emit} calls and signals the
 * command iterable to stop, but does not call `stream.end()` or
 * `stream.destroy()`. The caller retains ownership.
 */
export class NdjsonTransport implements RpcTransport {
  private readonly input: Readable;
  private readonly emitter: NdjsonEmitter;
  private readonly output: Writable;
  private closed = false;

  /**
   * Creates a new NDJSON transport.
   *
   * Registers no-op `'error'` listeners on both streams to prevent
   * unhandled `'error'` events from crashing the process. Actual error
   * handling is performed by the consumer (e.g. the `for await` loop in
   * {@link commands} converts stream errors into thrown exceptions, and
   * {@link RpcServer} catches those).
   *
   * @param input - The readable stream to consume commands from (e.g. `process.stdin`).
   * @param output - The writable stream to emit events to (e.g. `process.stdout`).
   */
  constructor(input: Readable, output: Writable) {
    this.input = input;
    this.output = output;
    this.emitter = new NdjsonEmitter(output);

    // Prevent unhandled 'error' events from crashing the process.
    // Stream errors are surfaced through the for-await loop (input) and
    // the try/catch in the RpcServer bus subscriber (output).
    this.input.on('error', () => {});
    this.output.on('error', () => {});
  }

  /**
   * Serialize an {@link RpcEvent} to NDJSON and write it to the output stream.
   *
   * @param event - The RPC event to emit.
   * @returns `true` if flushed immediately, `false` if buffered (backpressure).
   * @throws If the transport has been {@link close | closed}.
   */
  emit(event: RpcEvent): boolean {
    if (this.closed) {
      throw new Error('NdjsonTransport is closed');
    }
    return this.emitter.emit(event);
  }

  /**
   * Return an async iterable that yields validated {@link RpcCommand} objects
   * parsed from the input stream.
   *
   * The iterable completes when the input stream ends or when {@link close}
   * is called.
   *
   * @param options - Optional configuration including an `onError` callback
   *                  for malformed or invalid messages.
   */
  async *commands(
    options: TransportParseOptions = {},
  ): AsyncGenerator<RpcCommand> {
    for await (const command of parseNdjsonStream(this.input, {
      onError: options.onError,
    })) {
      if (this.closed) return;
      yield command;
    }
  }

  /**
   * Mark the transport as closed.
   *
   * Subsequent calls to {@link emit} will throw and the {@link commands}
   * iterable will complete on its next iteration.
   *
   * This does **not** end or destroy the underlying streams — the caller
   * retains ownership.
   */
  close(): void {
    this.closed = true;
    this.emitter.close();
  }
}
