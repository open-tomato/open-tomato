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

  const rewritten = rewriteFileRefs(manifest, resolveVersion);
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
