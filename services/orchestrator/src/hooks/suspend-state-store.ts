/**
 * @packageDocumentation
 * Persistent store for suspended orchestration loop state.
 *
 * When a hook triggers a `suspend` disposition, the orchestration engine
 * writes the current loop state to disk so it can be recovered at the next
 * startup and resumed from the exact point of suspension.
 */

import type { SuspendState } from './types.js';

import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

import { suspendStateSchema } from './schema.js';

/**
 * Reads and writes `suspend-state.json` within a configured state directory.
 *
 * The store uses `Bun.write` / `Bun.file` for I/O and validates recovered
 * state with the `suspendStateSchema` Zod schema so callers always receive
 * a well-formed `SuspendState` or `null`.
 */
export class SuspendStateStore {
  private readonly filePath: string;

  /**
   * @param stateDir - Directory where `suspend-state.json` is stored.
   *   The directory is created on first `persist` call if it does not exist.
   */
  constructor(private readonly stateDir: string) {
    this.filePath = path.join(stateDir, 'suspend-state.json');
  }

  /**
   * Serialise `state` to JSON and write it to `<stateDir>/suspend-state.json`.
   *
   * Creates `stateDir` (and any missing parent directories) if it does not
   * already exist before writing.
   *
   * @param state - The suspend state to persist.
   */
  async persist(state: SuspendState): Promise<void> {
    await mkdir(this.stateDir, { recursive: true });
    await Bun.write(this.filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Read and validate `suspend-state.json` if it exists.
   *
   * Returns `null` when the file is absent. Throws a Zod `ZodError` if the
   * file exists but its contents fail schema validation.
   *
   * @returns Parsed and validated `SuspendState`, or `null` if no file exists.
   */
  async recover(): Promise<SuspendState | null> {
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) {
      return null;
    }
    const raw: unknown = await file.json();
    return suspendStateSchema.parse(raw);
  }

  /**
   * Delete `suspend-state.json` if it exists.
   *
   * A no-op when the file is already absent.
   */
  async clear(): Promise<void> {
    if (await Bun.file(this.filePath).exists()) {
      await unlink(this.filePath);
    }
  }
}
