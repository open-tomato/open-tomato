import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Walk parent directories from `startDir` looking for a repo-root marker.
 *
 * A directory is considered the repo root when it contains either:
 * - a `.open-tomato-root` file (explicit marker), or
 * - a `package.json` with a `"workspaces"` field (workspace root).
 *
 * Returns the absolute path to the root, or `null` when no marker is
 * found before reaching the filesystem root.
 */
export function resolveRepoRoot(
  startDir: string = process.cwd(),
): string | null {
  let dir = path.resolve(startDir);

  for (;;) {
    if (fs.existsSync(path.join(dir, '.open-tomato-root'))) {
      return dir;
    }

    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as { workspaces?: unknown };
        if (pkg.workspaces !== undefined) {
          return dir;
        }
      } catch {
        // Malformed package.json — keep walking up.
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
