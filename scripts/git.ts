/**
 * Git helpers shared by preflight + add-changeset.
 */

import { execFileSync } from "node:child_process";

/**
 * Relative paths changed vs `base`, unioning committed (base...HEAD), unstaged
 * working-tree changes, and untracked files. Returns null when git can't answer
 * (e.g. the base ref doesn't exist), so callers can degrade gracefully.
 */
export function gitChangedRelPaths(root: string, base: string): string[] | null {
  const run = (args: string[]): string =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  try {
    const committed = run(["diff", "--name-only", `${base}...HEAD`]);
    const working = run(["diff", "--name-only", "HEAD"]);
    const untracked = run(["ls-files", "--others", "--exclude-standard"]);
    return [
      ...committed.split("\n"),
      ...working.split("\n"),
      ...untracked.split("\n"),
    ]
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}
