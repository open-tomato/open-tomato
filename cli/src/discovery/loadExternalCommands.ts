
import type { CommandModule } from '../registry.js';
import type { Manifest } from './loadManifest.js';

import { pathToFileURL } from 'node:url';

export interface ExternalCommand {
  tool: string;
  command: string;
  module: CommandModule;
}

export type ExternalCommandImporter = (
  specifier: string,
) => Promise<unknown>;

const cache = new Map<string, Promise<readonly ExternalCommand[]>>();

function hasCallableDefault(value: unknown): value is CommandModule {
  if (typeof value !== 'object' || value === null) return false;
  const mod = value as { default?: unknown };
  return typeof mod.default === 'function';
}

/**
 * Default importer used in production. Note: under bun / Node this resolves
 * absolute `file://` URLs the manifest produced via `pathToFileURL`. Test
 * runners that intercept `import()` (Vitest/Vite) cannot resolve OS-tmpdir
 * paths through their SSR module graph; tests pass an in-memory importer.
 */
const defaultImporter: ExternalCommandImporter = (specifier) => import(specifier);

/**
 * Dynamically import each module referenced by the manifest and return the
 * loaded external commands. Results are cached per `rootDir` so subsequent
 * calls in the same process return the same array reference instead of
 * re-importing.
 *
 * Failure modes:
 * - A module that throws on import is skipped with a `console.warn` naming
 *   the failing path; other modules still load.
 * - A module whose loaded shape lacks a callable `default` export is skipped
 *   with a `console.warn`; other modules still load.
 *
 * The optional `meta` export is accepted but not required: legacy modules
 * with only `default` are loaded the same way as new-shape modules with
 * both `meta` and `default`.
 */
export function loadExternalCommands(
  manifest: Manifest,
  rootDir: string,
  importer: ExternalCommandImporter = defaultImporter,
): Promise<readonly ExternalCommand[]> {
  const cached = cache.get(rootDir);
  if (cached !== undefined) return cached;

  const pending = (async (): Promise<readonly ExternalCommand[]> => {
    const loaded: ExternalCommand[] = [];

    for (const entry of manifest.commands) {
      let mod: unknown;
      try {
        mod = await importer(pathToFileURL(entry.module).href);
      } catch (error) {
        const reason = error instanceof Error
          ? error.message
          : String(error);
        console.warn(
          `[open-tomato] failed to import external command module ${entry.module}: ${reason}`,
        );
        continue;
      }

      if (!hasCallableDefault(mod)) {
        console.warn(
          `[open-tomato] external command module ${entry.module} has no callable \`default\` export; skipping`,
        );
        continue;
      }

      loaded.push({
        tool: entry.tool,
        command: entry.command,
        module: mod,
      });
    }

    return loaded;
  })();

  cache.set(rootDir, pending);
  return pending;
}

/**
 * Clear the cache. Intended for use in tests; production code should rely on
 * the per-process cache so external commands are imported at most once.
 */
export function clearExternalCommandsCache(): void {
  cache.clear();
}
