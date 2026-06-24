/**
 * Registry-targeting helpers shared by preflight + publish.
 *
 * The single most important safety property of this repo's release tooling is
 * that @open-tomato packages NEVER publish to a public registry. These helpers
 * resolve the effective scope registry from .npmrc files and classify hosts.
 */

import { existsSync, readFileSync } from "node:fs";

/** The private registry every @open-tomato / @bifemecanico package targets. */
export const PRIVATE_REGISTRY = "https://npm.heimdall.bifemecanico.com/";

/** Hosts that must never receive an @open-tomato publish. */
export const PUBLIC_REGISTRY_HOSTS = [
  "registry.npmjs.org",
  "registry.yarnpkg.com",
  "npm.pkg.github.com",
] as const;

export function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

export function isPublicRegistryUrl(url: string): boolean {
  const host = hostOf(url);
  return PUBLIC_REGISTRY_HOSTS.some((h) => host === h);
}

/**
 * Parse `@scope:registry=<url>` from raw .npmrc text. Returns undefined when the
 * scope is not mapped. Ignores comments and surrounding whitespace.
 */
export function parseScopeRegistry(
  npmrc: string,
  scope: string,
): string | undefined {
  const key = `${scope}:registry`;
  for (const rawLine of npmrc.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() === key) {
      return line.slice(eq + 1).trim();
    }
  }
  return undefined;
}

/**
 * Resolve the effective registry for a scope across an ordered list of .npmrc
 * file paths (most-specific first wins). Missing files are skipped.
 */
export function resolveScopeRegistry(
  npmrcPaths: string[],
  scope: string,
): string | undefined {
  for (const path of npmrcPaths) {
    if (!existsSync(path)) continue;
    const found = parseScopeRegistry(readFileSync(path, "utf8"), scope);
    if (found) return found;
  }
  return undefined;
}
