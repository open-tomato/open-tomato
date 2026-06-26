import fs from 'node:fs';
import path from 'node:path';

export interface ManifestCommandEntry {
  tool: string;
  command: string;
  module: string;
}

export interface Manifest {
  commands: ManifestCommandEntry[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isValidEntry(value: unknown): value is ManifestCommandEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isNonEmptyString(v.tool) &&
    isNonEmptyString(v.command) &&
    isNonEmptyString(v.module)
  );
}

/**
 * Read `<rootDir>/package.json` and return the `ot.commands` manifest with
 * each `module` path resolved against `rootDir` to an absolute path.
 *
 * Failure modes:
 * - Missing `package.json`, or `ot.commands` absent → return `null`
 *   (the consumer simply has no external commands).
 * - `package.json` is unparseable, or `ot` / `ot.commands` is the wrong
 *   shape → return `null` with a `console.warn` so the dispatcher can
 *   continue with internal commands only.
 * - Individual entries missing the required `tool` / `command` / `module`
 *   string fields are skipped with a warning; valid entries are kept.
 */
export function loadManifest(rootDir: string): Manifest | null {
  const pkgPath = path.join(rootDir, 'package.json');

  let raw: string;
  try {
    raw = fs.readFileSync(pkgPath, 'utf8');
  } catch {
    return null;
  }

  let pkg: unknown;
  try {
    pkg = JSON.parse(raw);
  } catch {
    console.warn(
      `[open-tomato] ${pkgPath}: failed to parse package.json; skipping external commands`,
    );
    return null;
  }

  if (typeof pkg !== 'object' || pkg === null) return null;

  const ot = (pkg as Record<string, unknown>).ot;
  if (ot === undefined) return null;
  if (typeof ot !== 'object' || ot === null) {
    console.warn(
      `[open-tomato] ${pkgPath}: \`ot\` must be an object; skipping external commands`,
    );
    return null;
  }

  const commands = (ot as Record<string, unknown>).commands;
  if (commands === undefined) return null;

  if (!Array.isArray(commands)) {
    console.warn(
      `[open-tomato] ${pkgPath}: \`ot.commands\` must be an array; skipping external commands`,
    );
    return null;
  }

  const valid: ManifestCommandEntry[] = [];
  for (const entry of commands) {
    if (!isValidEntry(entry)) {
      console.warn(
        `[open-tomato] ${pkgPath}: skipping malformed \`ot.commands\` entry: ${JSON.stringify(entry)}`,
      );
      continue;
    }
    valid.push({
      tool: entry.tool,
      command: entry.command,
      module: path.resolve(rootDir, entry.module),
    });
  }

  return { commands: valid };
}
