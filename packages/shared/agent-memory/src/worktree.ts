/**
 * @module worktree
 *
 * Utilities for resolving memory file paths across git worktrees.
 *
 * When `.ralph/agent/memories.md` is symlinked from a worktree to a shared
 * store in the main worktree, all file-locking operations must target the
 * real inode (not the symlink path) so that locks from different worktrees
 * are mutually exclusive.
 */

import { realpathSync } from 'node:fs';

/**
 * Resolves the canonical path of a memory file by following any symlinks.
 *
 * File locking via `proper-lockfile` requires all callers to lock the same
 * inode. If the memories file is a symlink (e.g. when sharing state across
 * git worktrees), passing the symlink path to the locker would result in
 * separate lock files per symlink path rather than per inode. Use this
 * function to normalise the path before constructing a {@link MarkdownMemoryStore}.
 *
 * @param baseDir - Path to the memory file or a symlink pointing to it.
 * @returns The real, resolved path with all symlinks expanded.
 * @throws {Error} If `baseDir` does not exist or cannot be resolved.
 *
 * @example
 * ```typescript
 * // In a git worktree where .ralph/agent/memories.md is a symlink:
 * const realPath = resolveMemoryFilePath('.ralph/agent/memories.md');
 * const store = new MarkdownMemoryStore(realPath);
 * ```
 */
export function resolveMemoryFilePath(baseDir: string): string {
  return realpathSync(baseDir);
}
