/**
 * Reference-free gate (PoC decision D4, docs/plans/poc-release/05-ui-components-port.md):
 * published @open-tomato/ui-* packages (and theme-default) must not reference
 * the internal design pipeline. Scans the source trees for banned strings and
 * fails the publish gate on any hit.
 *
 * Usage: bun packages/scripts/reference-gate.ts [--root <repo-root>]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const GATED_DIRS = ["packages/ui", "packages/shared/theme-default"] as const;

export const BANNED_PATTERNS: ReadonlyArray<RegExp> = [
  /pre-components/i,
  /component-breakdown/i,
  /raw-design/i,
  /design-bundle/i,
  /raw design system/i,
  /claude\.ai\/design/i,
  /rosetta/i,
  /compare-design/i,
];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "visual",
  "storybook-static",
  ".turbo",
  ".git",
]);

// Temporary publish-guard markers describe the pending port and are neither
// packed by npm nor kept past wave 0 — they may name the source pipeline.
const SKIP_FILES = new Set(["REFACTOR_NEEDED.md"]);

const TEXT_EXT_RE =
  /\.(ts|tsx|js|jsx|mjs|cjs|css|md|json|yaml|yml|html|txt|sh|npmrc|gitignore)$/i;

export interface Finding {
  file: string;
  line: number;
  pattern: string;
  text: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* walk(full);
    } else if (
      !SKIP_FILES.has(entry) &&
      (TEXT_EXT_RE.test(entry) || !entry.includes("."))
    ) {
      yield full;
    }
  }
}

export function scan(root: string): Finding[] {
  const findings: Finding[] = [];
  for (const gated of GATED_DIRS) {
    const base = resolve(root, gated);
    let entries: string[];
    try {
      entries = [...walk(base)];
    } catch {
      continue; // gated dir absent (e.g. ui-portal not created yet)
    }
    for (const file of entries) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((text, i) => {
        for (const pattern of BANNED_PATTERNS) {
          if (pattern.test(text)) {
            findings.push({
              file: relative(root, file),
              line: i + 1,
              pattern: String(pattern),
              text: text.trim().slice(0, 120),
            });
          }
        }
      });
    }
  }
  return findings;
}

if (import.meta.main) {
  const rootFlag = process.argv.indexOf("--root");
  const root = rootFlag > -1 ? process.argv[rootFlag + 1] : process.cwd();
  const findings = scan(root);
  if (findings.length === 0) {
    console.log("[reference-gate] OK — no internal design-pipeline references in gated packages.");
    process.exit(0);
  }
  console.error(`[reference-gate] FAIL — ${findings.length} banned reference(s):`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.pattern}  ${f.text}`);
  }
  process.exit(1);
}
