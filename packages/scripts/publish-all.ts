/**
 * Publish driver invoked by changesets/action after a Version PR merge.
 *
 * 1. Read the publish set from `changeset status --output=<path>`.
 * 2. For each package (topological order honored by changeset), stage via
 *    prepare-publish, run publint on the staged manifest, then
 *    `bun publish --access public --provenance`.
 * 3. Emit the published list as JSON on stdout for the Changesets action.
 *
 * Exits nonzero on any failure.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prepare } from "./prepare-publish";

interface ChangesetRelease {
  name: string;
  newVersion: string;
}

interface ChangesetStatus {
  releases?: ChangesetRelease[];
}

function readChangesetStatus(): ChangesetStatus {
  const tmp = mkdtempSync(join(tmpdir(), "changeset-status-"));
  const outPath = join(tmp, "status.json");
  try {
    execFileSync("bunx", ["changeset", "status", "--output", outPath], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    if (!existsSync(outPath)) return { releases: [] };
    return JSON.parse(readFileSync(outPath, "utf8")) as ChangesetStatus;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function packageNameToPath(): Record<string, string> {
  const root = resolve(process.cwd());
  const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    workspaces?: string[];
  };
  const out: Record<string, string> = {};
  for (const glob of rootPkg.workspaces ?? []) {
    const dir = glob.replace("/*", "");
    const absDir = join(root, dir);
    if (!existsSync(absDir)) continue;
    for (const sub of readdirSync(absDir)) {
      const pkgPath = join(absDir, sub, "package.json");
      if (!existsSync(pkgPath)) continue;
      const name = (JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string }).name;
      if (name) out[name] = join(dir, sub);
    }
  }
  return out;
}

function main(): void {
  const status = readChangesetStatus();
  const releases = status.releases ?? [];
  if (releases.length === 0) {
    console.log(JSON.stringify([]));
    return;
  }

  const nameToPath = packageNameToPath();
  const stagingRoot = resolve(process.cwd(), ".staging");
  const published: { name: string; version: string }[] = [];

  for (const rel of releases) {
    const pkgPath = nameToPath[rel.name];
    if (!pkgPath) {
      throw new Error(`cannot resolve path for ${rel.name}`);
    }
    console.error(`[publish] staging ${rel.name}@${rel.newVersion}`);
    const stageDir = prepare({ packagePath: resolve(pkgPath), stagingRoot });

    console.error(`[publish] publint ${rel.name}`);
    execFileSync("bunx", ["publint"], { cwd: stageDir, stdio: "inherit" });

    console.error(`[publish] publishing ${rel.name}@${rel.newVersion}`);
    execFileSync(
      "bun",
      ["publish", "--access", "public", "--provenance"],
      { cwd: stageDir, stdio: "inherit" },
    );

    published.push({ name: rel.name, version: rel.newVersion });
  }

  console.log(JSON.stringify(published));
}

main();
