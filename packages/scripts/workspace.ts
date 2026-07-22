/**
 * Workspace enumeration shared by preflight + publish.
 *
 * Produces rich, path-aware info about every package declared by the root
 * manifest's `workspaces` field — enough to validate naming conventions,
 * compute publish eligibility, and locate manifests.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { isPublishEligible, type Manifest } from "./prepare-publish";

/** Group directories whose name is NOT part of the published package name. */
export const GROUP_DIRS = ["shared", "service", "notifications"] as const;

export interface PackageInfo {
  name: string;
  dir: string;
  relDir: string;
  group: string;
  basename: string;
  version: string;
  private: boolean;
  eligible: boolean;
  manifest: Manifest;
}

/**
 * Expected package name for a directory, per the repo convention:
 *   - shared/<x>          -> @open-tomato/<x>
 *   - service/<x>         -> @open-tomato/<x>          (group is not in the name)
 *   - notifications/<x>   -> @open-tomato/notifications-<x>  (group flattened in)
 *   - agents/<x>          -> @open-tomato/agents-<x>   (group flattened in)
 *   - <direct>            -> @open-tomato/<direct>
 *
 * The direct (un-grouped) member `cli` IS published and follows the
 * `<direct> -> @open-tomato/<direct>` convention (`@open-tomato/cli`), so it
 * goes through publish-time naming validation like any grouped package.
 *
 * The remaining direct members — `types`, `app`, and `templates/*` — use
 * bespoke published names (`@open-tomato/repo-types`,
 * `@open-tomato/template-service-express`, …) but are all private, so they
 * never reach the registry. See preflight.ts checkManifests: naming/semver
 * checks are skipped for `pkg.private === true`.
 */
export function expectedPackageName(group: string, base: string): string {
  if (group === "notifications") return `@open-tomato/notifications-${base}`;
  if (group === "agents") return `@open-tomato/agents-${base}`;
  if (group === "ui") return `@open-tomato/ui-${base}`;
  return `@open-tomato/${base}`;
}

function readManifest(dir: string): Manifest | null {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  return JSON.parse(readFileSync(pkgPath, "utf8")) as Manifest;
}

function toInfo(root: string, dir: string): PackageInfo | null {
  const manifest = readManifest(dir);
  if (!manifest || !manifest.name) return null;
  const relDir = relative(root, dir);
  const segments = relDir.split("/");
  // Group is the directory immediately above the package itself.
  // - Pre-consolidation: root=packages/, relDir="shared/logger", group="shared".
  // - Post-consolidation: root=open-tomato/, relDir="packages/shared/logger", group="shared".
  // Backwards-compatible: when there's only one segment (a flat workspace
  // member like "cli"), group is "".
  const group = segments.length > 1 ? segments[segments.length - 2] : "";
  return {
    name: manifest.name,
    dir,
    relDir,
    group,
    basename: basename(dir),
    version: manifest.version,
    private: manifest.private === true,
    eligible: isPublishEligible(dir),
    manifest,
  };
}

/** Scopes that belong to the internal @open-tomato ecosystem. */
export const INTERNAL_SCOPE_RE = /^@(open-tomato|bifemecanico)\//;

// Matches prepare-publish's DEP_FIELDS: publish staging rewrites + verifies all
// four, so preflight must inspect all four to stay consistent (a file: devDep
// would otherwise pass preflight but fail at publish time).
const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/** [name, spec] pairs for every internal-scope dependency across dep fields. */
export function internalDeps(manifest: Manifest): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const field of DEP_FIELDS) {
    const deps = manifest[field] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (INTERNAL_SCOPE_RE.test(name)) out.push([name, spec]);
    }
  }
  return out;
}

export function listWorkspacePackages(root: string): PackageInfo[] {
  const rootPkg = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as { workspaces?: string[] };
  const out: PackageInfo[] = [];
  for (const glob of rootPkg.workspaces ?? []) {
    if (glob.endsWith("/*")) {
      const baseDir = resolve(root, glob.slice(0, -2));
      if (!existsSync(baseDir)) continue;
      for (const sub of readdirSync(baseDir)) {
        const info = toInfo(root, join(baseDir, sub));
        if (info) out.push(info);
      }
    } else {
      const info = toInfo(root, resolve(root, glob));
      if (info) out.push(info);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
