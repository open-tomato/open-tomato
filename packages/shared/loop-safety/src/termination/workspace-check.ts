import { access as fsAccess } from 'node:fs/promises';

/**
 * Creates a function that checks whether a workspace path is accessible on disk.
 *
 * Uses `fs.access` to test whether the path exists and is reachable. Returns
 * `true` when accessible, `false` when the access check throws (path missing,
 * permission denied, etc.).
 *
 * @param workspacePath - The absolute path to the workspace directory to check.
 * @param accessFn - Optional override for `fs.access`; used in tests.
 * @returns An async predicate that resolves to `true` if the path is accessible.
 */
export function createWorkspaceExistsCheck(
  workspacePath: string,
  accessFn: (path: string) => Promise<void> = fsAccess,
): () => Promise<boolean> {
  return async () => {
    try {
      await accessFn(workspacePath);
      return true;
    } catch {
      return false;
    }
  };
}
