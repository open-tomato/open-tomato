/**
 * @packageDocumentation
 * NDJSON emitter for serializing {@link RpcEvent} objects to a writable stream.
 *
 * Each event is serialized as a single JSON object followed by a newline (`\n`),
 * conforming to the Newline-Delimited JSON (NDJSON) specification. This is the
 * outbound half of the NDJSON transport — the inbound half is handled by the
 * {@link parseNdjsonStream} parser in `ndjson-parser.ts`.
 *
 * @example
 * ```ts
 * import { NdjsonEmitter } from './ndjson-emitter.js';
 *
 * const emitter = new NdjsonEmitter(process.stdout);
 * emitter.emit({ event: 'loop_started', data: { timestamp: new Date().toISOString(), prompt: 'hello' } });
 * emitter.close();
 * ```
 */

import type { RpcEvent } from '../types/index.js';
import type { Writable } from 'node:stream';

/**
 * Serializes {@link RpcEvent} objects to newline-delimited JSON and writes them
 * to a `Writable` stream.
 *
 * Each call to {@link NdjsonEmitter.emit} produces exactly one line of output:
 * the JSON-serialized event followed by a `\n` character.
 *
 * The emitter does **not** validate events against the Zod schema before writing —
 * callers are responsible for constructing well-typed events. This keeps the hot
 * path allocation-free beyond the `JSON.stringify` call itself.
 */
export class NdjsonEmitter {
  private readonly stream: Writable;
  private closed = false;

  /**
   * Creates a new NDJSON emitter that writes to the given stream.
   *
   * @param stream - The writable stream to emit events to (e.g. `process.stdout`).
   */
  constructor(stream: Writable) {
    this.stream = stream;
  }

  /**
   * Serializes an {@link RpcEvent} to JSON and writes it as a single
   * newline-terminated line to the underlying stream.
   *
   * @param event - The RPC event to emit.
   * @returns `true` if the write was flushed to the underlying resource,
   *          `false` if the data was queued in the stream buffer (backpressure).
   * @throws If the emitter has been {@link NdjsonEmitter.close | closed}.
   */
  emit(event: RpcEvent): boolean {
    if (this.closed) {
      throw new Error('NdjsonEmitter is closed');
    }
    return this.stream.write(JSON.stringify(event) + '\n');
  }

  /**
   * Marks the emitter as closed. Subsequent calls to {@link NdjsonEmitter.emit}
   * will throw.
   *
   * This does **not** call `stream.end()` — the caller retains ownership of the
   * underlying stream and is responsible for ending it when appropriate.
   */
  close(): void {
    this.closed = true;
  }
}
