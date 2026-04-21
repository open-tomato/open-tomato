/**
 * @packageDocumentation
 * Telemetry for the hook lifecycle system.
 *
 * `HookTelemetry` appends a newline-delimited JSON log of every hook run to
 * `hook-runs.jsonl` in a configured log directory and exposes a `readRuns`
 * helper for observability tooling.
 */

import type { HookResult } from './types.js';

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of characters retained from stderr in a telemetry record. */
const STDERR_TRUNCATE_CHARS = 512;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A single persisted telemetry record — a `HookResult` plus a wall-clock timestamp. */
interface HookRunRecord extends HookResult {
  /** ISO 8601 timestamp recorded at the moment the run was logged. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// HookTelemetry
// ---------------------------------------------------------------------------

/**
 * Appends and reads hook run records from `hook-runs.jsonl` in the configured
 * log directory.
 *
 * Each record is a JSON object on its own line (JSONL format) containing the
 * full `HookResult` fields plus a `timestamp`.  Stderr is included as-is;
 * callers are responsible for truncating it before passing the result to
 * `logRun` if they want to limit storage size.
 */
export class HookTelemetry {
  private readonly logPath: string;

  /**
   * @param logDir - Directory where `hook-runs.jsonl` is stored.
   *   Created on the first `logRun` call if it does not exist.
   */
  constructor(private readonly logDir: string) {
    this.logPath = path.join(logDir, 'hook-runs.jsonl');
  }

  /**
   * Append a JSONL record for a completed hook run.
   *
   * The record includes `timestamp`, `hookName`, `phase`, `exitCode`,
   * `durationMs`, `disposition`, `stderr`, and all other `HookResult` fields.
   * Creates `logDir` (and any missing parent directories) if absent.
   *
   * @param result - The hook result to persist.
   */
  async logRun(result: HookResult): Promise<void> {
    await mkdir(this.logDir, { recursive: true });

    const record: HookRunRecord = {
      ...result,
      stderr: result.stderr.slice(0, STDERR_TRUNCATE_CHARS),
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(record) + '\n';
    await appendFile(this.logPath, line, 'utf8');
  }

  /**
   * Read and parse the last `limit` entries from `hook-runs.jsonl`.
   *
   * Returns an empty array when the log file does not exist yet.
   * Lines that cannot be parsed as JSON are silently skipped to keep the
   * reader resilient against partially-written records.
   *
   * @param limit - Maximum number of most-recent entries to return.
   *   When omitted all entries are returned.
   * @returns Parsed `HookResult` array in chronological order (oldest first).
   */
  async readRuns(limit?: number): Promise<HookResult[]> {
    let raw: string;

    try {
      raw = await readFile(this.logPath, 'utf8');
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }

    const lines = raw.split('\n').filter((l) => l.trim().length > 0);

    const records: HookResult[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as HookResult);
      } catch {
        // skip malformed lines
      }
    }

    if (limit !== undefined && limit < records.length) {
      return records.slice(records.length - limit);
    }

    return records;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNodeError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
