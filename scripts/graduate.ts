/**
 * Graduate a gated package to publish-eligible — the mechanical half of the
 * RELEASING.md "Creating a new publishable package" checklist.
 *
 * For each target package it:
 *   1. deletes REFACTOR_NEEDED.md (the publish block),
 *   2. flips "private": true -> false,
 *   3. (optional) sets the version baseline (e.g. 0.1.0 for a first release),
 *   4. ensures publishConfig.access is present,
 *   5. removes the package from .changeset/config.json's ignore list.
 *
 * Manifest edits are TEXT-surgical (regex on the raw JSON) to keep diffs to the
 * touched fields — no full reserialize/reorder. Pure transform is exported +
 * tested; main() is the CLI. Content metadata (description, files, README) is
 * left to the author — this only un-gates.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { listWorkspacePackages } from "./workspace";

export interface GraduateManifestOptions {
  setVersion?: string;
  access?: string;
}

/** Apply the manifest edits to raw package.json text. Returns new text + a log. */
export function graduateManifestText(
  text: string,
  opts: GraduateManifestOptions = {},
): { text: string; changes: string[] } {
  let out = text;
  const changes: string[] = [];

  if (/"private"\s*:\s*true/.test(out)) {
    out = out.replace(/"private"\s*:\s*true/, '"private": false');
    changes.push("private:false");
  }

  if (opts.setVersion) {
    out = out.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${opts.setVersion}"`);
    changes.push(`version:${opts.setVersion}`);
  }

  if (!/"publishConfig"\s*:/.test(out)) {
    const access = opts.access ?? "public";
    // Insert after the top-level "name" line (always first, always comma-terminated).
    out = out.replace(
      /^(\s*)"name"\s*:\s*"[^"]*",\r?\n/m,
      (match, indent: string) =>
        `${match}${indent}"publishConfig": { "access": "${access}" },\n`,
    );
    changes.push(`publishConfig.access:${access}`);
  }

  return { text: out, changes };
}

/** Remove the named packages from the changeset config's ignore array. */
export function removeFromChangesetIgnore(
  configText: string,
  names: string[],
): { text: string; removed: string[] } {
  const config = JSON.parse(configText) as { ignore?: string[] };
  const before = config.ignore ?? [];
  const removed = before.filter((n) => names.includes(n));
  config.ignore = before.filter((n) => !names.includes(n));
  return { text: JSON.stringify(config, null, 2) + "\n", removed };
}

export interface GraduateResult {
  name: string;
  relDir: string;
  changes: string[];
  removedRefactorMarker: boolean;
}

export interface GraduateOptions {
  root: string;
  packageDirs: string[];
  setVersion?: string;
  access?: string;
  dryRun?: boolean;
}

export function graduate(opts: GraduateOptions): GraduateResult[] {
  const results: GraduateResult[] = [];
  const names: string[] = [];

  for (const dir of opts.packageDirs) {
    const manifestPath = join(dir, "package.json");
    const raw = readFileSync(manifestPath, "utf8");
    const name = (JSON.parse(raw) as { name: string }).name;
    const { text, changes } = graduateManifestText(raw, {
      setVersion: opts.setVersion,
      access: opts.access,
    });
    const markerPath = join(dir, "REFACTOR_NEEDED.md");
    const hadMarker = existsSync(markerPath);

    if (!opts.dryRun) {
      if (text !== raw) writeFileSync(manifestPath, text);
      if (hadMarker) rmSync(markerPath);
    }
    if (hadMarker) changes.push("removed REFACTOR_NEEDED.md");
    names.push(name);
    results.push({
      name,
      relDir: dir.replace(`${opts.root}/`, ""),
      changes,
      removedRefactorMarker: hadMarker,
    });
  }

  // Clear graduated packages out of the changeset ignore list (one write).
  const configPath = join(opts.root, ".changeset", "config.json");
  if (existsSync(configPath)) {
    const { text, removed } = removeFromChangesetIgnore(
      readFileSync(configPath, "utf8"),
      names,
    );
    if (!opts.dryRun && removed.length > 0) writeFileSync(configPath, text);
  }

  return results;
}

function main(argv: string[]): void {
  const root = resolve(process.cwd());
  const all = argv.includes("--all");
  const dryRun = argv.includes("--dry-run");
  const verIdx = argv.indexOf("--set-version");
  const setVersion = verIdx !== -1 ? argv[verIdx + 1] : undefined;
  const accessIdx = argv.indexOf("--access");
  const access = accessIdx !== -1 ? argv[accessIdx + 1] : undefined;

  const packages = listWorkspacePackages(root);
  let dirs: string[];
  if (all) {
    dirs = packages.filter((p) => !p.eligible).map((p) => p.dir);
  } else {
    const positional = argv.filter((a) => !a.startsWith("--") && a !== setVersion && a !== access);
    const byRelDir = new Map(packages.map((p) => [p.relDir, p.dir]));
    const byName = new Map(packages.map((p) => [p.name, p.dir]));
    dirs = positional
      .map((a) => byRelDir.get(a) ?? byName.get(a) ?? resolve(root, a))
      .filter((d) => existsSync(join(d, "package.json")));
  }

  if (dirs.length === 0) {
    console.error("graduate: no target packages (use --all or pass package paths/names).");
    process.exit(2);
  }

  const results = graduate({ root, packageDirs: dirs, setVersion, access, dryRun });
  const label = dryRun ? "DRY RUN — would graduate" : "graduated";
  console.error(`${label} ${results.length} package(s):`);
  for (const r of results) {
    console.error(`  ${r.name} (${r.relDir}): ${r.changes.join(", ")}`);
  }
  console.log(JSON.stringify(results.map((r) => r.name)));
}

if (import.meta.main) main(process.argv.slice(2));
