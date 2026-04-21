/**
 * @packageDocumentation
 * NDJSON parser for deserializing {@link RpcCommand} objects from a readable stream.
 *
 * Reads chunks from a `NodeJS.ReadableStream`, buffers partial lines across
 * chunk boundaries, and yields one parsed {@link RpcCommand} per complete
 * newline-terminated JSON line. Each line is validated against the
 * {@link rpcCommandSchema} Zod schema — malformed JSON and messages that do not
 * match a known command shape are silently discarded and reported via an
 * `onError` callback rather than thrown.
 *
 * This is the inbound half of the NDJSON transport — the outbound half is
 * handled by the {@link NdjsonEmitter} in `ndjson-emitter.ts`.
 *
 * @example
 * ```ts
 * import { parseNdjsonStream } from './ndjson-parser.js';
 *
 * for await (const command of parseNdjsonStream(process.stdin, {
 *   onError: (err) => console.error(err.code, err.message),
 * })) {
 *   console.log(command.method, command);
 * }
 * ```
 */

import type { RpcCommand } from '../types/index.js';
import type { Readable } from 'node:stream';

import { rpcCommandSchema } from '../types/commands.js';

/**
 * Error information produced when a line cannot be parsed or validated.
 *
 * This mirrors the shape of {@link ErrorData} from the events schema so the
 * caller can forward it directly as an `error` event payload.
 */
export interface NdjsonParseError {
  /** Machine-readable error code (`PARSE_ERROR` or `VALIDATION_ERROR`). */
  code: 'PARSE_ERROR' | 'VALIDATION_ERROR';
  /** Human-readable description of what went wrong. */
  message: string;
  /** ISO-8601 timestamp when the error was detected. */
  timestamp: string;
  /** The raw line that caused the error. */
  details: { rawLine: string };
}

/**
 * Options accepted by {@link parseNdjsonStream}.
 */
export interface ParseNdjsonOptions {
  /**
   * Called when a line cannot be parsed as JSON or fails Zod validation.
   *
   * The caller is expected to emit this as an `error` RPC event (or log it).
   * If omitted, malformed lines are silently discarded.
   */
  onError?: (error: NdjsonParseError) => void;
}

/**
 * Attempts to parse and validate a single NDJSON line, yielding the result
 * or invoking the error callback.
 *
 * @returns The validated {@link RpcCommand}, or `undefined` if the line is invalid.
 */
function parseLine(
  trimmed: string,
  onError?: (error: NdjsonParseError) => void,
): RpcCommand | undefined {
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    onError?.({
      code: 'PARSE_ERROR',
      message: `Invalid JSON: ${trimmed.length > 200
        ? trimmed.slice(0, 200) + '…'
        : trimmed}`,
      timestamp: new Date().toISOString(),
      details: { rawLine: trimmed },
    });
    return undefined;
  }

  const result = rpcCommandSchema.safeParse(json);
  if (!result.success) {
    onError?.({
      code: 'VALIDATION_ERROR',
      message: `Invalid RPC command: ${result.error.message}`,
      timestamp: new Date().toISOString(),
      details: { rawLine: trimmed },
    });
    return undefined;
  }

  return result.data;
}

/**
 * Async generator that reads newline-delimited JSON from a {@link Readable}
 * stream and yields validated {@link RpcCommand} objects.
 *
 * Chunks may arrive at arbitrary boundaries — the generator maintains an
 * internal buffer to reassemble partial lines before parsing. Empty lines
 * (blank or whitespace-only) are silently skipped.
 *
 * Lines that contain invalid JSON or do not match the {@link rpcCommandSchema}
 * are discarded and reported through the optional `onError` callback rather
 * than thrown. This keeps the consumer loop alive even when the input stream
 * contains garbage or unknown message types.
 *
 * @param stream - The readable stream to consume (e.g. `process.stdin`).
 * @param options - Optional configuration including an `onError` callback.
 * @yields Validated {@link RpcCommand} objects, one per valid NDJSON line.
 */
export async function* parseNdjsonStream(
  stream: Readable,
  options: ParseNdjsonOptions = {},
): AsyncGenerator<RpcCommand> {
  let buffer = '';
  const { onError } = options;

  for await (const chunk of stream) {
    buffer += String(chunk);
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        const command = parseLine(trimmed, onError);
        if (command !== undefined) {
          yield command;
        }
      }
    }
  }

  // Flush any remaining buffered content after the stream ends
  const remaining = buffer.trim();
  if (remaining) {
    const command = parseLine(remaining, onError);
    if (command !== undefined) {
      yield command;
    }
  }
}
