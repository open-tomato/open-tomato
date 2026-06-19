/**
 * Publish driver — manual-from-local today, drop-in for CI tomorrow.
 *
 * Determines the publish set by REGISTRY DIFF (publish any eligible package
 * whose current local version is not yet on the private registry), which is
 * robust whether or not `changeset version` has run. Each package is staged
 * (file:/workspace: refs rewritten to ^version), linted with publint, then
 * published to the PRIVATE registry — in dependency order.
 *
 * Safety:
 *   - Targets the private registry only (scope mapping in packages/.npmrc).
 *   - Provenance is OFF unless NPM_CONFIG_PROVENANCE=true (Sigstore/OIDC is
 *     npmjs-only; a private registry can't honor it).
 *   - Requires --yes to actually publish; otherwise runs as a dry run.
 *
 * The exported functions are pure + unit-tested; main() is the CLI wrapper,
 * ready to be lifted into the `tomato` CLI later.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { prepare } from "./prepare-publish";
import { resolveScopeRegistry } from "./registry";
import {
  internalDeps,
  listWorkspacePackages,
  type PackageInfo,
} from "./workspace";

export type PublishedVersionsResolver = (name: string) => string[] | null;

/** Eligible packages whose current local version is not yet on the registry. */
export function computePublishSet(
  eligible: PackageInfo[],
  publishedVersionsOf: PublishedVersionsResolver,
): PackageInfo[] {
  return eligible.filter((pkg) => {
    const versions = publishedVersionsOf(pkg.name);
    if (versions == null) return true; // never published
    return !versions.includes(pkg.version);
  });
}

/**
 * Order packages so internal dependencies publish before their dependents
 * (Kahn's algorithm, stable by name). Dependencies outside the set are ignored.
 */
export function topoSortByInternalDeps(packages: PackageInfo[]): PackageInfo[] {
  const names = new Set(packages.map((p) => p.name));
  const byName = new Map(packages.map((p) => [p.name, p]));
  const indeg = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const p of packages) indeg.set(p.name, 0);
  for (const p of packages) {
    for (const [dep] of internalDeps(p.manifest)) {
      if (names.has(dep) && dep !== p.name) {
        dependents.set(dep, [...(dependents.get(dep) ?? []), p.name]);
        indeg.set(p.name, (indeg.get(p.name) ?? 0) + 1);
      }
    }
  }
  const queue = packages
    .filter((p) => indeg.get(p.name) === 0)
    .map((p) => p.name)
    .sort();
  const order: PackageInfo[] = [];
  while (queue.length) {
    const name = queue.shift()!;
    order.push(byName.get(name)!);
    for (const dependent of (dependents.get(name) ?? []).sort()) {
      indeg.set(dependent, indeg.get(dependent)! - 1);
      if (indeg.get(dependent) === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }
  // Cycle fallback: append anything left so we never silently drop a package.
  if (order.length < packages.length) {
    const placed = new Set(order.map((p) => p.name));
    for (const p of packages) if (!placed.has(p.name)) order.push(p);
  }
  return order;
}

// ---------------------------------------------------------------------------
// IO
// ---------------------------------------------------------------------------

export function publishedVersionsViaNpm(
  registry: string,
): PublishedVersionsResolver {
  return (name) => {
    try {
      const raw = execFileSync(
        "npm",
        ["view", name, "versions", "--json", "--registry", registry],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const parsed = JSON.parse(raw) as string[] | string;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return null; // package not found on the registry
    }
  };
}

interface PublishOptions {
  root: string;
  registry: string;
  stagingRoot: string;
  dryRun: boolean;
  provenance: boolean;
}

function publishOne(stageDir: string, opts: PublishOptions): void {
  execFileSync("bunx", ["publint"], { cwd: stageDir, stdio: "inherit" });
  if (opts.dryRun) {
    execFileSync("npm", ["pack", "--dry-run"], { cwd: stageDir, stdio: "inherit" });
    return;
  }
  const args = ["publish", "--registry", opts.registry];
  if (opts.provenance) args.push("--provenance");
  execFileSync("bun", args, { cwd: stageDir, stdio: "inherit" });
}

function run(opts: PublishOptions): { name: string; version: string }[] {
  const eligible = listWorkspacePackages(opts.root).filter((p) => p.eligible);
  const set = computePublishSet(eligible, publishedVersionsViaNpm(opts.registry));
  const ordered = topoSortByInternalDeps(set);

  if (ordered.length === 0) {
    console.error("[publish] nothing to publish — every eligible package is already on the registry.");
    return [];
  }

  const mode = opts.dryRun ? "DRY RUN" : "PUBLISH";
  console.error(`[publish] ${mode} -> ${opts.registry}`);
  for (const pkg of ordered) {
    console.error(`  - ${pkg.name}@${pkg.version} (${pkg.relDir})`);
  }

  const published: { name: string; version: string }[] = [];
  for (const pkg of ordered) {
    console.error(`[publish] staging ${pkg.name}@${pkg.version}`);
    const stageDir = prepare({
      packagePath: pkg.dir,
      stagingRoot: opts.stagingRoot,
      workspaceRoot: opts.root,
    });
    publishOne(stageDir, opts);
    published.push({ name: pkg.name, version: pkg.version });
  }
  return published;
}

function main(argv: string[]): void {
  const root = resolve(process.cwd());
  const yes = argv.includes("--yes");
  const dryRun = argv.includes("--dry-run") || !yes;
  const regIdx = argv.indexOf("--registry");
  const registry =
    regIdx !== -1
      ? argv[regIdx + 1]!
      : resolveScopeRegistry(
          [resolve(root, ".npmrc"), resolve(root, "..", ".npmrc"), resolve(process.env.HOME ?? "", ".npmrc")],
          "@open-tomato",
        ) ?? "https://npm.heimdall.bifemecanico.com/";

  if (!yes && !argv.includes("--dry-run")) {
    console.error("[publish] no --yes flag — running as a dry run. Re-run with --yes to publish for real.\n");
  }

  const published = run({
    root,
    registry,
    stagingRoot: resolve(root, ".staging"),
    dryRun,
    provenance: process.env.NPM_CONFIG_PROVENANCE === "true",
  });

  // Machine-readable result on stdout (parity with the CI changesets action).
  console.log(JSON.stringify(published));
}

if (import.meta.main) main(process.argv.slice(2));
