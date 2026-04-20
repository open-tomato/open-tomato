import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Remove oldest `session-*` subdirectories from `baseDir`, keeping at most
 * `keep` directories.  Directories are sorted lexicographically — because
 * session names are ISO-timestamp-derived they sort chronologically.
 *
 * @param baseDir - Directory that contains `session-*` subdirectories.
 * @param keep    - Maximum number of session directories to retain.
 */
export async function rotateSessions(
  baseDir: string,
  keep: number,
): Promise<void> {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const sessions = entries
    .filter(e => e.isDirectory() && e.name.startsWith('session-'))
    .map(e => e.name)
    .sort();

  const toRemove = sessions.slice(0, Math.max(0, sessions.length - keep));
  await Promise.all(
    toRemove.map(name => rm(join(baseDir, name), { recursive: true, force: true })),
  );
}

/**
 * Create a timestamped session subdirectory inside `baseDir` and rotate old
 * sessions so that at most five are retained.
 *
 * The subdirectory name is derived from the current UTC time in ISO 8601
 * format with colons and dots replaced by hyphens, e.g.
 * `session-2026-03-30T12-00-00-000Z`.
 *
 * @param baseDir - Parent directory in which to create the session directory.
 *   The directory is created if it does not yet exist.
 * @returns The absolute path of the newly created session directory.
 */
export async function initSessionDir(baseDir: string): Promise<string> {
  const sessionId = new Date().toISOString()
    .replace(/[:.]/g, '-');
  const sessionDir = join(baseDir, `session-${sessionId}`);
  await mkdir(sessionDir, { recursive: true });
  await rotateSessions(baseDir, 5);
  return sessionDir;
}
