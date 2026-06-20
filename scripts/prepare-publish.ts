/**
 * CI-only publish staging shim.
 *
 * For a given package path:
 *   1. Read the package.json.
 *   2. Rewrite every `file:../x` @open-tomato/* dep to `^<version-of-x>`.
 *   3. Copy the package into a staging dir.
 *   4. Write the rewritten manifest into the staging dir.
 *   5. Verify no file:/workspace:/relative refs remain.
 *   6. Print the staging path on stdout. Exit 0 on success, nonzero on failure.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { dirname, basename, join, resolve } from "node:path";

type DepMap = Record<string, string>;
export interface Manifest {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: DepMap;
  peerDependencies?: DepMap;
  devDependencies?: DepMap;
  optionalDependencies?: DepMap;
  files?: string[];
  [k: string]: unknown;
}

const DEP_FIELDS = [
  "dependencies",
  "peerDependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

export function rewriteFileRefs(
  manifest: Manifest,
  resolveVersion: (spec: string) => string,
): Manifest {
  const out: Manifest = { ...manifest };
  for (const field of DEP_FIELDS) {
    const deps = manifest[field] as DepMap | undefined;
    if (!deps) continue;
    const nextDeps: DepMap = { ...deps };
    for (const [name, spec] of Object.entries(deps)) {
      if (spec.startsWith("file:")) {
        nextDeps[name] = `^${resolveVersion(spec)}`;
      }
    }
    out[field] = nextDeps;
  }
  return out;
}

/**
 * Map a `workspace:` protocol spec to a concrete semver range, mirroring the
 * replacement bun/pnpm/yarn perform at publish time:
 *   workspace:*  -> <version>      (exact)
 *   workspace:^  -> ^<version>
 *   workspace:~  -> ~<version>
 *   workspace:<range> -> <range>   (explicit range passed through verbatim)
 */
export function resolveWorkspaceRange(spec: string, version: string): string {
  if (!spec.startsWith("workspace:")) {
    throw new Error(`resolveWorkspaceRange: not a workspace: spec: ${spec}`);
  }
  const rest = spec.slice("workspace:".length);
  if (rest === "" || rest === "*") return version;
  if (rest === "^") return `^${version}`;
  if (rest === "~") return `~${version}`;
  return rest;
}

export function rewriteWorkspaceRefs(
  manifest: Manifest,
  resolveVersion: (name: string) => string,
): Manifest {
  const out: Manifest = { ...manifest };
  for (const field of DEP_FIELDS) {
    const deps = manifest[field] as DepMap | undefined;
    if (!deps) continue;
    const nextDeps: DepMap = { ...deps };
    for (const [name, spec] of Object.entries(deps)) {
      if (spec.startsWith("workspace:")) {
        nextDeps[name] = resolveWorkspaceRange(spec, resolveVersion(name));
      }
    }
    out[field] = nextDeps;
  }
  return out;
}

export interface WorkspaceEntry {
  dir: string;
  version: string;
  private?: boolean;
}

/**
 * Index every package declared by the root manifest's `workspaces` field by
 * package name. Supports both glob entries (`shared/*`) and direct entries
 * (`ui-skeleton`). Needed to resolve `workspace:` refs, which carry only a
 * package name (no path).
 */
export function buildWorkspaceIndex(
  workspaceRoot: string,
): Record<string, WorkspaceEntry> {
  const rootPkgPath = join(workspaceRoot, "package.json");
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8")) as {
    workspaces?: string[];
  };
  const index: Record<string, WorkspaceEntry> = {};

  const addDir = (absDir: string): void => {
    const pkgPath = join(absDir, "package.json");
    if (!existsSync(pkgPath)) return;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Manifest;
    if (!pkg.name) return;
    index[pkg.name] = { dir: absDir, version: pkg.version, private: pkg.private };
  };

  for (const glob of rootPkg.workspaces ?? []) {
    if (glob.endsWith("/*")) {
      const baseDir = resolve(workspaceRoot, glob.slice(0, -2));
      if (!existsSync(baseDir)) continue;
      for (const sub of readdirSync(baseDir)) {
        addDir(join(baseDir, sub));
      }
    } else {
      addDir(resolve(workspaceRoot, glob));
    }
  }
  return index;
}

/**
 * Walk up from a package directory to the nearest ancestor whose package.json
 * declares a `workspaces` field. Returns null when no such root exists.
 */
export function findWorkspaceRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        workspaces?: unknown;
      };
      if (Array.isArray(pkg.workspaces)) return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function verifyNoLocalRefs(manifest: Manifest): void {
  for (const field of DEP_FIELDS) {
    const deps = manifest[field] as DepMap | undefined;
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (spec.startsWith("file:")) {
        throw new Error(
          `${manifest.name}: ${field}.${name} still contains a file: ref: ${spec}`,
        );
      }
      if (spec.startsWith("workspace:")) {
        throw new Error(
          `${manifest.name}: ${field}.${name} still contains a workspace: ref: ${spec}`,
        );
      }
      if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
        throw new Error(
          `${manifest.name}: ${field}.${name} contains a relative-path ref: ${spec}`,
        );
      }
    }
  }
}

export function resolveSiblingVersion(packagePath: string, fileSpec: string): string {
  if (!fileSpec.startsWith("file:")) {
    throw new Error(`resolveSiblingVersion: not a file: spec: ${fileSpec}`);
  }
  const relPath = fileSpec.slice("file:".length);
  const siblingDir = resolve(packagePath, relPath);
  const siblingPkgPath = join(siblingDir, "package.json");
  if (!existsSync(siblingPkgPath)) {
    throw new Error(
      `resolveSiblingVersion: sibling package.json not found at ${siblingPkgPath}`,
    );
  }
  const sibling = JSON.parse(readFileSync(siblingPkgPath, "utf8")) as Manifest;
  return sibling.version;
}

export function isPublishEligible(packagePath: string): boolean {
  const pkgPath = join(packagePath, "package.json");
  if (!existsSync(pkgPath)) return false;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Manifest;
  if (pkg.private === true) return false;
  if (existsSync(join(packagePath, "REFACTOR_NEEDED.md"))) return false;
  return true;
}

export interface PrepareOptions {
  packagePath: string;
  stagingRoot: string;
  /**
   * Workspace root used to resolve `workspace:` refs by package name. Defaults
   * to the nearest ancestor whose package.json declares `workspaces`.
   */
  workspaceRoot?: string;
}

export function prepare(opts: PrepareOptions): string {
  const { packagePath, stagingRoot } = opts;

  if (existsSync(join(packagePath, "REFACTOR_NEEDED.md"))) {
    throw new Error(`${packagePath}: REFACTOR_NEEDED.md present — publish blocked`);
  }
  const manifestPath = join(packagePath, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.private === true) {
    throw new Error(`${manifest.name}: private: true — publish blocked`);
  }

  const resolveVersion = (spec: string): string => {
    if (!spec.startsWith("file:")) {
      throw new Error(`expected file: spec, got ${spec}`);
    }
    const relPath = spec.slice("file:".length);
    const siblingDir = resolve(packagePath, relPath);
    if (!isPublishEligible(siblingDir)) {
      throw new Error(
        `${manifest.name}: dependency ${spec} -> ${siblingDir} is not publish-eligible`,
      );
    }
    return resolveSiblingVersion(packagePath, spec);
  };

  let rewritten = rewriteFileRefs(manifest, resolveVersion);

  // Resolve workspace: refs by package name via the workspace index. Only
  // built when the manifest actually contains a workspace: ref so packages
  // outside a workspace (or already fully file:-linked) stay unaffected.
  const hasWorkspaceRef = DEP_FIELDS.some((field) =>
    Object.values((manifest[field] as DepMap | undefined) ?? {}).some((spec) =>
      spec.startsWith("workspace:"),
    ),
  );
  if (hasWorkspaceRef) {
    const workspaceRoot = opts.workspaceRoot ?? findWorkspaceRoot(packagePath);
    if (!workspaceRoot) {
      throw new Error(
        `${manifest.name}: manifest uses workspace: refs but no workspace root (package.json with "workspaces") was found above ${packagePath}`,
      );
    }
    const index = buildWorkspaceIndex(workspaceRoot);
    const resolveWorkspaceVersion = (name: string): string => {
      const entry = index[name];
      if (!entry) {
        throw new Error(
          `${manifest.name}: workspace dependency ${name} not found in workspace ${workspaceRoot}`,
        );
      }
      if (!isPublishEligible(entry.dir)) {
        throw new Error(
          `${manifest.name}: dependency ${name} -> ${entry.dir} is not publish-eligible`,
        );
      }
      return entry.version;
    };
    rewritten = rewriteWorkspaceRefs(rewritten, resolveWorkspaceVersion);
  }

  verifyNoLocalRefs(rewritten);

  const stageDir = join(stagingRoot, basename(packagePath));
  if (existsSync(stageDir)) rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(dirname(stageDir), { recursive: true });
  cpSync(packagePath, stageDir, { recursive: true });
  writeFileSync(
    join(stageDir, "package.json"),
    JSON.stringify(rewritten, null, 2) + "\n",
  );

  return stageDir;
}

function main(argv: string[]): void {
  const packageArg = argv[2];
  if (!packageArg) {
    console.error("usage: bun scripts/prepare-publish.ts <package-path>");
    process.exit(2);
  }
  const packagePath = resolve(packageArg);
  const stagingRoot = resolve(process.cwd(), ".staging");
  try {
    const stageDir = prepare({ packagePath, stagingRoot });
    console.log(stageDir);
  } catch (err) {
    console.error(`[prepare-publish] ${(err as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) main(process.argv);
