/**
 * Release preflight — the "standards check" gate run before publishing.
 *
 * Verifies, for the @open-tomato package ecosystem:
 *   1. registry   — every scope is pinned to the PRIVATE registry, never public.
 *   2. manifests  — valid semver + name matches the directory convention.
 *   3. changesets — every CHANGED publish-eligible package has a pending bump.
 *   4. local refs — eligible packages' file:/workspace: deps resolve to eligible
 *                   siblings (i.e. nothing blocks them from publishing cleanly).
 *   5. deprecation— no eligible package consumes a DEPRECATED version of an
 *                   internal @open-tomato dependency.
 *
 * Pure logic is exported and unit-tested; IO (git, changeset, npm view) is
 * injectable so the same orchestrator runs locally and in CI. A thin main()
 * wraps it as a CLI; the exported `runPreflight` is CLI-tool-ready.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildWorkspaceIndex,
  isPublishEligible,
  resolveWorkspaceRange,
} from "./prepare-publish";
import {
  isPublicRegistryUrl,
  resolveScopeRegistry,
} from "./registry";
import { gitChangedRelPaths } from "./git";
import {
  expectedPackageName,
  internalDeps,
  listWorkspacePackages,
  type PackageInfo,
} from "./workspace";

const SCOPES = ["@open-tomato", "@bifemecanico"] as const;

// Official semver core regex (with optional prerelease + build metadata).
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version);
}

export type Level = "error" | "warning";
export interface Finding {
  level: Level;
  check: string;
  message: string;
}
export interface PreflightReport {
  ok: boolean;
  findings: Finding[];
}

const err = (check: string, message: string): Finding => ({
  level: "error",
  check,
  message,
});
const warn = (check: string, message: string): Finding => ({
  level: "warning",
  check,
  message,
});

// ---------------------------------------------------------------------------
// Pure checks
// ---------------------------------------------------------------------------

export function checkRegistry(
  npmrcPaths: string[],
  packages: PackageInfo[],
): Finding[] {
  const findings: Finding[] = [];
  for (const scope of SCOPES) {
    const url = resolveScopeRegistry(npmrcPaths, scope);
    if (!url) {
      findings.push(
        err(
          "registry",
          `${scope} is not pinned to a registry in any .npmrc — a clean checkout would publish to PUBLIC npm. Add "${scope}:registry=<private url>" to packages/.npmrc.`,
        ),
      );
    } else if (isPublicRegistryUrl(url)) {
      findings.push(
        err("registry", `${scope} resolves to a PUBLIC registry (${url}).`),
      );
    }
  }
  // Defense in depth: a per-package publishConfig.registry must not be public.
  for (const pkg of packages) {
    const pc = pkg.manifest.publishConfig as { registry?: string } | undefined;
    if (pc?.registry && isPublicRegistryUrl(pc.registry)) {
      findings.push(
        err(
          "registry",
          `${pkg.name}: publishConfig.registry points to a PUBLIC registry (${pc.registry}).`,
        ),
      );
    }
  }
  return findings;
}

export function checkManifests(packages: PackageInfo[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Map<string, string>();
  for (const pkg of packages) {
    // Naming + semver conventions only apply to publishable packages.
    // Private workspace members (e.g., the cli, types, templates, services,
    // app) use bespoke names and may omit version — they never reach the
    // registry, so the convention isn't meaningful for them.
    if (!pkg.private) {
      if (!isValidSemver(pkg.version)) {
        findings.push(
          err("semver", `${pkg.relDir}: version "${pkg.version}" is not valid semver.`),
        );
      }
      const expected = expectedPackageName(pkg.group, pkg.basename);
      if (pkg.name !== expected) {
        findings.push(
          err(
            "naming",
            `${pkg.relDir}: name "${pkg.name}" does not match convention (expected "${expected}").`,
          ),
        );
      }
    }
    const prev = seen.get(pkg.name);
    if (prev) {
      findings.push(
        err("naming", `duplicate package name "${pkg.name}" in ${prev} and ${pkg.relDir}.`),
      );
    }
    seen.set(pkg.name, pkg.relDir);
  }
  return findings;
}

/**
 * Changed publish-eligible packages that have no pending changeset. These would
 * ship code changes without a version bump — the core "all changed packages
 * must bump" rule.
 */
export function findUncoveredPackages(
  changedEligible: PackageInfo[],
  pendingBumpNames: Set<string>,
): string[] {
  return changedEligible
    .filter((pkg) => !pendingBumpNames.has(pkg.name))
    .map((pkg) => pkg.name);
}

export function changedPackages(
  packages: PackageInfo[],
  changedRelPaths: string[],
): PackageInfo[] {
  return packages.filter((pkg) =>
    changedRelPaths.some(
      (p) => p === pkg.relDir || p.startsWith(`${pkg.relDir}/`),
    ),
  );
}

// ---------------------------------------------------------------------------
// Local-ref + deprecation checks (need the workspace index / registry)
// ---------------------------------------------------------------------------

/**
 * Monorepo policy: internal deps use `workspace:` refs (rewritten to ^version
 * at publish time), never `file:` paths. Flags any remaining file: ref as an
 * error so the split-brain state can't return.
 */
export function checkNoFileRefs(packages: PackageInfo[]): Finding[] {
  const findings: Finding[] = [];
  for (const pkg of packages) {
    for (const [depName, spec] of internalDeps(pkg.manifest)) {
      if (spec.startsWith("file:")) {
        findings.push(
          err(
            "no-file-refs",
            `${pkg.relDir}: ${depName} uses a file: ref (${spec}) — monorepo policy is workspace: refs. Change it to "workspace:^".`,
          ),
        );
      }
    }
  }
  return findings;
}

export interface DepLookup {
  version: string;
  deprecated?: string;
}
export type DeprecationResolver = (
  name: string,
  range: string,
) => DepLookup | null;

/**
 * Compute the version range an internal dep would carry once published:
 *   file:../x -> ^<x.version>, workspace:^ -> ^<x.version>, else: as-is.
 */
export function publishedRange(
  spec: string,
  index: Record<string, { version: string }>,
  depName: string,
): string {
  if (spec.startsWith("file:")) {
    const v = index[depName]?.version;
    return v ? `^${v}` : spec;
  }
  if (spec.startsWith("workspace:")) {
    const v = index[depName]?.version ?? "0.0.0";
    return resolveWorkspaceRange(spec, v);
  }
  return spec;
}

export function checkLocalRefsAndDeprecation(
  root: string,
  eligible: PackageInfo[],
  lookupDeprecation: DeprecationResolver | null,
): Finding[] {
  const findings: Finding[] = [];
  if (eligible.length === 0) return findings;
  const index = buildWorkspaceIndex(root);

  for (const pkg of eligible) {
    for (const [depName, spec] of internalDeps(pkg.manifest)) {
      const isLocalRef = spec.startsWith("file:") || spec.startsWith("workspace:");
      if (isLocalRef) {
        const entry = index[depName];
        if (!entry) {
          findings.push(
            err("local-refs", `${pkg.name}: ${depName} (${spec}) does not resolve to a workspace package.`),
          );
          continue;
        }
        if (!isPublishEligible(entry.dir)) {
          findings.push(
            err("local-refs", `${pkg.name}: depends on ${depName} (${spec}) which is not publish-eligible (private or REFACTOR_NEEDED).`),
          );
          continue;
        }
      }
      if (lookupDeprecation) {
        const range = publishedRange(spec, index, depName);
        const hit = lookupDeprecation(depName, range);
        if (hit?.deprecated) {
          findings.push(
            err("deprecation", `${pkg.name}: consumes deprecated ${depName}@${hit.version} (${range}) — "${hit.deprecated}".`),
          );
        }
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Orchestrator + default IO
// ---------------------------------------------------------------------------

export interface PreflightOptions {
  root: string;
  npmrcPaths?: string[];
  changedRelPaths?: string[] | null;
  pendingBumpNames?: string[];
  lookupDeprecation?: DeprecationResolver | null;
  /** Skip the changed-must-bump check (e.g. an initial graduation that sets the
   *  baseline version directly rather than via a changeset). */
  skipChangeset?: boolean;
}

export function runPreflight(opts: PreflightOptions): PreflightReport {
  const { root } = opts;
  const npmrcPaths = opts.npmrcPaths ?? defaultNpmrcPaths(root);
  const packages = listWorkspacePackages(root);
  const eligible = packages.filter((p) => p.eligible);

  const findings: Finding[] = [
    ...checkRegistry(npmrcPaths, packages),
    ...checkManifests(packages),
    ...checkNoFileRefs(packages),
  ];

  if (opts.skipChangeset) {
    // intentionally skipped (e.g. initial graduation)
  } else if (opts.changedRelPaths == null) {
    findings.push(
      warn("changesets", "could not determine changed files (no git base) — skipping changed-must-bump check."),
    );
  } else {
    const pending = new Set(opts.pendingBumpNames ?? []);
    const changedEligible = changedPackages(packages, opts.changedRelPaths).filter(
      (p) => p.eligible,
    );
    for (const name of findUncoveredPackages(changedEligible, pending)) {
      findings.push(
        err("changesets", `${name} has changes but no pending changeset — run "bunx changeset" to declare a version bump.`),
      );
    }
  }

  findings.push(
    ...checkLocalRefsAndDeprecation(root, eligible, opts.lookupDeprecation ?? null),
  );

  return { ok: !findings.some((f) => f.level === "error"), findings };
}

export function defaultNpmrcPaths(root: string): string[] {
  return [
    join(root, ".npmrc"),
    join(root, "..", ".npmrc"),
    join(process.env.HOME ?? "", ".npmrc"),
  ];
}

function changesetPendingNames(root: string): string[] {
  const tmp = mkdtempSync(join(tmpdir(), "preflight-cs-"));
  const outPath = join(tmp, "status.json");
  try {
    execFileSync("bunx", ["changeset", "status", "--output", outPath], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    if (!existsSync(outPath)) return [];
    const status = JSON.parse(readFileSync(outPath, "utf8")) as {
      releases?: Array<{ name: string }>;
    };
    return (status.releases ?? []).map((r) => r.name);
  } catch {
    return [];
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function npmViewDeprecation(registry: string): DeprecationResolver {
  return (name, range) => {
    try {
      const raw = execFileSync(
        "npm",
        ["view", `${name}@${range}`, "version", "deprecated", "--json", "--registry", registry],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const parsed = JSON.parse(raw) as
        | { version?: string; deprecated?: string }
        | Array<{ version?: string; deprecated?: string }>;
      const last = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
      if (!last?.version) return null;
      return { version: last.version, deprecated: last.deprecated };
    } catch {
      // Not published yet / not found — not a deprecation, don't block.
      return null;
    }
  };
}

function formatReport(report: PreflightReport): string {
  if (report.findings.length === 0) return "preflight: OK — all standards checks passed.";
  const lines = report.findings.map((f) => {
    const tag = f.level === "error" ? "ERROR" : "warn ";
    return `  [${tag}] (${f.check}) ${f.message}`;
  });
  const errors = report.findings.filter((f) => f.level === "error").length;
  const warnings = report.findings.length - errors;
  return [
    `preflight: ${report.ok ? "PASS (with warnings)" : "FAIL"} — ${errors} error(s), ${warnings} warning(s)`,
    ...lines,
  ].join("\n");
}

function main(argv: string[]): void {
  const root = resolve(process.cwd());
  const asJson = argv.includes("--json");
  const skipDeprecation = argv.includes("--skip-deprecation");
  const skipChangeset = argv.includes("--skip-changeset");
  const baseIdx = argv.indexOf("--base");
  const base = baseIdx !== -1 ? argv[baseIdx + 1] : "main";
  const regIdx = argv.indexOf("--registry");
  const registry =
    regIdx !== -1
      ? argv[regIdx + 1]
      : resolveScopeRegistry(defaultNpmrcPaths(root), "@open-tomato") ??
        "https://npm.heimdall.bifemecanico.com/";

  const report = runPreflight({
    root,
    skipChangeset,
    changedRelPaths: skipChangeset ? undefined : gitChangedRelPaths(root, base),
    pendingBumpNames: skipChangeset ? undefined : changesetPendingNames(root),
    lookupDeprecation: skipDeprecation ? null : npmViewDeprecation(registry),
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.main) main(process.argv.slice(2));
