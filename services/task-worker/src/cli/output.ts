/**
 * NDJSON output writer for CLI mode.
 *
 * Events are written to stdout as line-delimited JSON matching the same
 * shape as the SSE events in HTTP mode. The executor's
 * `TaskWorkerCliClient` reads these lines to build a `WorkerProcess`.
 */

import type { SseEvent } from '@open-tomato/worker-protocol';

import { toNdjsonLine } from '@open-tomato/worker-protocol';

/** Writes an event as an NDJSON line to stdout. */
export function writeEvent(event: SseEvent): void {
  process.stdout.write(toNdjsonLine(event));
}

/** Writes a diagnostic message to stderr (does not pollute stdout events). */
export function writeDiag(message: string): void {
  process.stderr.write(`${message}\n`);
}
