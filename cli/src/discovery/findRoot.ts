import fs from 'node:fs';
import path from 'node:path';

const MARKER_FILENAME = '.open-tomato-root';

/**
 * Walk parent directories from `startDir` upward looking for a
 * `.open-tomato-root` marker file. Returns the directory that contains
 * the marker, or `null` if the walk reaches the filesystem root without
 * finding one.
 *
 * The returned path is the marker's *containing directory*, not the
 * marker file itself, so callers can resolve sibling files (e.g.,
 * `package.json`) against it.
 */
export function findOpenTomatoRoot(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    const markerPath = path.join(current, MARKER_FILENAME);
    if (fs.existsSync(markerPath)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}
