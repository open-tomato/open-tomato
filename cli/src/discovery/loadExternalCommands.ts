
import type { CommandModule } from '../registry.js';
import type { Manifest } from './loadManifest.js';
import type { CliCommand } from '@open-tomato/cli-core';

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

/**
 * A CliCommand-like object: a plain object exposing a callable `run` method.
 * grow-box's command modules export these directly (the OPT-137 `CliCommand`
 * shape) rather than a bare function, so the loader treats `.run` as the
 * entrypoint and the object itself as the command's `meta`.
 */
function isCliCommandLike(value: unknown): value is CliCommand {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { run?: unknown }).run === 'function';
}

/**
 * Normalize an imported module into a {@link CommandModule}, accepting any of:
 *
 *   1. `{ default: fn }`                  — a bare callable default (legacy).
 *   2. `{ default: { run, ...meta } }`    — a CliCommand object as the default.
 *   3. `{ run, ...meta }`                 — a CliCommand object as the module
 *                                           namespace itself (no `default`).
 *
 * For the CliCommand shapes, `.run` becomes the callable `default` and the
 * CliCommand object becomes `meta`, so the dispatcher routes it through the
 * meta-aware path (`mod.default(ctx)` → `cmd.run(ctx)`). An explicit `meta`
 * export, when present, is preserved.
 */
function normalizeModule(value: unknown): CommandModule | null {
  if (typeof value !== 'object' || value === null) return null;
  const mod = value as { default?: unknown; meta?: unknown };

  // Case 1: bare callable default export.
  if (typeof mod.default === 'function') {
    return mod as CommandModule;
  }

  // Case 2: CliCommand object exported as default.
  if (isCliCommandLike(mod.default)) {
    const cmd = mod.default;
    return {
      default: (...args: unknown[]) => cmd.run(args[0] as Parameters<CliCommand['run']>[0]),
      meta: (mod.meta as CliCommand | undefined) ?? cmd,
    };
  }

  // Case 3: CliCommand object as the module namespace itself.
  if (isCliCommandLike(mod)) {
    const cmd = mod as unknown as CliCommand;
    return {
      default: (...args: unknown[]) => cmd.run(args[0] as Parameters<CliCommand['run']>[0]),
      meta: (mod.meta as CliCommand | undefined) ?? cmd,
    };
  }

  return null;
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
 * - A module whose loaded shape is neither a callable `default` export nor a
 *   CliCommand-like object (one exposing a callable `run`) is skipped with a
 *   `console.warn`; other modules still load.
 *
 * The optional `meta` export is accepted but not required: legacy modules
 * with only `default` are loaded the same way as new-shape modules with
 * both `meta` and `default`. CliCommand objects (default export or module
 * namespace) are normalized so `.run` is the entrypoint and the object is
 * the command `meta`.
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

      const normalized = normalizeModule(mod);
      if (normalized === null) {
        console.warn(
          `[open-tomato] external command module ${entry.module} has no callable \`default\` export or \`run\` method; skipping`,
        );
        continue;
      }

      loaded.push({
        tool: entry.tool,
        command: entry.command,
        module: normalized,
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
