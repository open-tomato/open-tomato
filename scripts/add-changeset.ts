/**
 * Non-interactive changeset writer — the deterministic primitive a loop agent
 * calls as a task's definition-of-done (`bunx changeset` is interactive and
 * useless for automation).
 *
 * Usage:
 *   # explicit packages + per-package level
 *   bun scripts/add-changeset.ts --summary "add child() logger" \
 *     --pkg @open-tomato/logger:minor --pkg @open-tomato/errors:patch
 *
 *   # one level for several packages
 *   bun scripts/add-changeset.ts --level patch --summary "fix typo" \
 *     --pkg @open-tomato/types --pkg @open-tomato/config
 *
 *   # auto-detect changed publishable packages from git, apply one level
 *   bun scripts/add-changeset.ts --level patch --summary "internal refactor"
 *
 * Writes `.changeset/<slug>.md`. Pure helpers are exported + tested; main() is
 * the CLI. Validates package eligibility + bump level before writing.
 */

import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gitChangedRelPaths } from "./git";
import { changedPackages } from "./preflight";
import { listWorkspacePackages, type PackageInfo } from "./workspace";

export const LEVELS = ["patch", "minor", "major"] as const;
export type Level = (typeof LEVELS)[number];
export interface Entry {
  name: string;
  level: Level;
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

/** Parse a `--pkg` value: `@scope/name:minor` or `@scope/name` (level optional). */
export function parsePkgArg(arg: string): { name: string; level?: string } {
  const at = arg.lastIndexOf(":");
  // Keep the scope's leading `@...` intact; only split a trailing `:level`.
  if (at > 0 && !arg.slice(at + 1).includes("/")) {
    return { name: arg.slice(0, at), level: arg.slice(at + 1) };
  }
  return { name: arg };
}

/** Markdown body for a changeset: frontmatter (name: level) + summary. */
export function buildChangesetContent(entries: Entry[], summary: string): string {
  const front = entries.map((e) => `"${e.name}": ${e.level}`).join("\n");
  return `---\n${front}\n---\n\n${summary.trim()}\n`;
}

/** Deterministic, readable slug from the entries + summary (no randomness). */
export function slugFor(entries: Entry[], summary: string): string {
  const hash = createHash("sha1")
    .update(entries.map((e) => `${e.name}:${e.level}`).join(",") + "|" + summary)
    .digest("hex")
    .slice(0, 8);
  const base = entries[0]?.name.split("/")[1] ?? "changeset";
  return `${base}-${hash}`;
}

export interface ResolveResult {
  entries: Entry[];
  errors: string[];
}

/**
 * Turn explicit `--pkg` args (and/or auto-detected changed packages) into a
 * validated entry list. Every package must exist and be publish-eligible; every
 * level must be valid. defaultLevel fills in packages given without a level.
 */
export function resolveEntries(opts: {
  explicit: Array<{ name: string; level?: string }>;
  autoDetected: string[];
  defaultLevel?: string;
  packages: PackageInfo[];
}): ResolveResult {
  const { explicit, autoDetected, defaultLevel, packages } = opts;
  const byName = new Map(packages.map((p) => [p.name, p]));
  const errors: string[] = [];
  const entries: Entry[] = [];
  const seen = new Set<string>();

  const sources =
    explicit.length > 0
      ? explicit
      : autoDetected.map((name) => ({ name, level: undefined as string | undefined }));

  if (sources.length === 0) {
    errors.push(
      "no target packages — pass --pkg, or make changes to a publishable package so git can detect them.",
    );
  }

  for (const src of sources) {
    if (seen.has(src.name)) continue;
    seen.add(src.name);
    const pkg = byName.get(src.name);
    if (!pkg) {
      errors.push(`unknown package "${src.name}" (not in this workspace).`);
      continue;
    }
    if (!pkg.eligible) {
      errors.push(
        `"${src.name}" is not publish-eligible (private or REFACTOR_NEEDED) — changesets would ignore it.`,
      );
      continue;
    }
    const level = src.level ?? defaultLevel;
    if (!level) {
      errors.push(`no bump level for "${src.name}" — pass --level or use --pkg name:level.`);
      continue;
    }
    if (!isLevel(level)) {
      errors.push(`invalid level "${level}" for "${src.name}" (use patch|minor|major).`);
      continue;
    }
    entries.push({ name: src.name, level });
  }

  return { entries, errors };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface ParsedArgs {
  summary?: string;
  level?: string;
  pkgs: string[];
  name?: string;
  base: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { pkgs: [], base: "main", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--summary") out.summary = argv[++i];
    else if (a === "--level") out.level = argv[++i];
    else if (a === "--pkg") out.pkgs.push(argv[++i]!);
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--base") out.base = argv[++i] ?? "main";
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function main(argv: string[]): void {
  const root = resolve(process.cwd());
  const args = parseArgs(argv);

  if (!args.summary || !args.summary.trim()) {
    console.error('add-changeset: --summary "<one line>" is required.');
    process.exit(2);
  }

  const packages = listWorkspacePackages(root);
  const explicit = args.pkgs.map(parsePkgArg);

  let autoDetected: string[] = [];
  if (explicit.length === 0) {
    const changed = gitChangedRelPaths(root, args.base);
    if (changed == null) {
      console.error(
        `add-changeset: couldn't determine changed files (base "${args.base}" missing?). Pass --pkg explicitly.`,
      );
      process.exit(2);
    }
    autoDetected = changedPackages(packages, changed)
      .filter((p) => p.eligible)
      .map((p) => p.name);
  }

  const { entries, errors } = resolveEntries({
    explicit,
    autoDetected,
    defaultLevel: args.level,
    packages,
  });

  if (errors.length > 0) {
    for (const e of errors) console.error(`add-changeset: ${e}`);
    process.exit(1);
  }

  const content = buildChangesetContent(entries, args.summary);
  const slug = args.name ?? slugFor(entries, args.summary);
  const filePath = join(root, ".changeset", `${slug}.md`);

  if (args.dryRun) {
    console.error(`# would write ${filePath}\n`);
    console.log(content);
    return;
  }

  if (existsSync(filePath)) {
    console.error(`add-changeset: ${filePath} already exists — pass a different --name.`);
    process.exit(1);
  }
  writeFileSync(filePath, content);
  console.error(
    `add-changeset: wrote .changeset/${slug}.md (${entries.map((e) => `${e.name}@${e.level}`).join(", ")})`,
  );
  console.log(filePath);
}

if (import.meta.main) main(process.argv.slice(2));
