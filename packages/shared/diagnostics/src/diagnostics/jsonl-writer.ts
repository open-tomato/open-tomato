import { appendFile } from 'node:fs/promises';

/**
 * Append-only JSONL writer that flushes each record to disk immediately.
 *
 * Every call to {@link JsonlWriter.append} serializes the record, injects an
 * ISO 8601 `ts` field, appends a newline, and writes the result via
 * `fs.appendFile` — no buffering, no batching.
 */
export class JsonlWriter {
  private readonly filePath: string;

  /**
   * @param filePath - Absolute or relative path to the JSONL file to write to.
   *   The file is created if it does not exist; existing content is preserved.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Serialize `record` to JSON, inject a `ts` timestamp, append a newline,
   * and flush to disk immediately.
   *
   * @param record - Arbitrary key-value record to persist. Any existing `ts`
   *   field is overwritten with the current ISO timestamp.
   * @returns A promise that resolves once the data has been flushed to disk.
   */
  async append(record: Record<string, unknown>): Promise<void> {
    const line =
      JSON.stringify({ ...record, ts: new Date().toISOString() }) + '\n';
    await appendFile(this.filePath, line, { encoding: 'utf8', flag: 'a' });
  }

  /**
   * No-op placeholder for future resource cleanup.
   *
   * Included so callers can call `writer.close()` unconditionally without
   * needing to guard on whether the writer holds open file handles.
   *
   * @returns A promise that resolves immediately.
   */
  async close(): Promise<void> {
    // No file handles are kept open between writes; nothing to release.
  }
}
