import type { BusEvent } from './types.js';

const isBun = typeof globalThis.Bun !== 'undefined';

/**
 * Appends a single `BusEvent` to a JSONL file at `filePath`.
 *
 * The event is serialized as a single JSON line followed by a newline (`\n`).
 * A `ts` field containing an ISO 8601 timestamp is added if the event does not
 * already carry one.
 *
 * When running under Bun, `Bun.file` / `Bun.write` are used for I/O.
 * Otherwise the function falls back to Node.js `fs/promises`.
 *
 * @param filePath - Absolute or relative path to the target JSONL file.
 * @param event    - The event to persist.
 *
 * @example
 * await appendEvent('./events.jsonl', { topic: 'build.done', payload: '{}' });
 */
export async function appendEvent(filePath: string, event: BusEvent): Promise<void> {
  const record: BusEvent = {
    ...event,
    ts: event.ts ?? new Date().toISOString(),
  };
  const line = JSON.stringify(record) + '\n';

  if (isBun) {
    const file = Bun.file(filePath);
    const existing = await file.exists()
      ? await file.text()
      : '';
    await Bun.write(filePath, existing + line);
  } else {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(filePath, line, 'utf8');
  }
}

/**
 * Reads all events from a JSONL file at `filePath` and returns them as an
 * array of `BusEvent` objects.
 *
 * Lines that cannot be parsed as valid JSON are skipped with a `console.warn`
 * warning so that a single corrupt entry does not prevent replay of the rest.
 *
 * Returns an empty array when the file does not exist.
 *
 * @param filePath - Absolute or relative path to the JSONL file to read.
 * @returns        Parsed `BusEvent` array in file order.
 *
 * @example
 * const events = await readEvents('./events.jsonl');
 * // events === [{ topic: 'build.done', payload: '{}', ts: '...' }, ...]
 */
export async function readEvents(filePath: string): Promise<BusEvent[]> {
  let text: string;

  try {
    if (isBun) {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return [];
      }
      text = await file.text();
    } else {
      const { readFile } = await import('node:fs/promises');
      try {
        text = await readFile(filePath, 'utf8');
      } catch (err: unknown) {
        if (isNodeNotFoundError(err)) {
          return [];
        }
        throw err;
      }
    }
  } catch (err: unknown) {
    if (isNodeNotFoundError(err)) {
      return [];
    }
    throw err;
  }

  const events: BusEvent[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed) as BusEvent;
      events.push(parsed);
    } catch {
      console.warn(`[event-bus] Skipping malformed JSONL line: ${trimmed}`);
    }
  }

  return events;
}

function isNodeNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'ENOENT'
  );
}
