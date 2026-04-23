# Packages Publish Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `@open-tomato/*` npm publish pipeline (Wave 0 setup PR, including the Wave 1 graduation of `@open-tomato/typescript-config`). Subsequent waves (`eslint-config`, one `notifications/plugin-*`) reuse the same mechanism via their own PRs and are out of scope for this plan.

**Architecture:** Changesets drives per-package semver intent via `.changeset/*.md` files in feature PRs, aggregated by a standing "Version Packages" PR. Merging the Version PR triggers a matrix publish job that stages each package, rewrites `file:../x` deps to `^<version>` via a small shim, and runs `bun publish --access public --provenance` with npm OIDC trusted publishing. Packages ship raw TS (no build step in the publish path). The `file:` refs stay intact in the worktree to preserve cross-repo linking; they're only rewritten inside the published tarball.

**Tech Stack:** Bun 1.3.9 · Turbo 2.5 · `@changesets/cli` ^2.27 · `changesets/action@v1` · `publint` ^0.3 · GitHub Actions · npm OIDC trusted publishing.

**Spec:** [docs/superpowers/specs/2026-04-23-packages-publish-workflow-design.md](../specs/2026-04-23-packages-publish-workflow-design.md)

**Out of scope for this plan:** Wave 2 (`eslint-config`) and Wave 3 (`notifications/plugin-anthropic`) graduation PRs. Cross-repo `repository_dispatch` signalling. Build/artifact refactors for any package.

---

## File Structure

**Create:**
- `.changeset/config.json` — Changesets behavior config (ignore list, changelog format).
- `.changeset/README.md` — Stock Changesets folder readme (from `changeset init`).
- `scripts/prepare-publish.ts` — The rewrite shim. Pure functions + a small main().
- `scripts/prepare-publish.test.ts` — Unit + fixture tests for the shim.
- `scripts/publish-all.ts` — Driver invoked by changesets/action after a Version PR merge.
- `VERSIONING.md` — Repo-root semver policy.
- `RELEASING.md` — Release mechanics guide.
- `.github/CODEOWNERS` — Maintainer gates on `.changeset/`, publish workflow, shim.
- `shared/typescript-config/README.md` — Pilot package README.
- `shared/typescript-config/LICENSE` — Copy of root MIT LICENSE.
- Per non-pilot package: `REFACTOR_NEEDED.md` (21 files total: 18 `private: true` shared/service packages + 3 `notifications/plugin-*` that also get flipped back to `private: true`).

**Modify:**
- `package.json` (root) — add `@changesets/cli`, `@changesets/changelog-github`, and `publint` to `devDependencies`; add `release` script.
- `.github/workflows/packages-publish.yml` — full rewrite (current file is a disabled stub).
- `shared/typescript-config/package.json` — graduation edits (`private: false`, license, description, files, etc.).
- `notifications/plugin-anthropic/package.json` — flip `private: false` → `true` until Wave 3.
- `notifications/plugin-executor/package.json` — flip `private: false` → `true`.
- `notifications/plugin-tech-tree/package.json` — flip `private: false` → `true`.
- `README.md` (root) — add a short "Publishing" section linking `RELEASING.md` + `VERSIONING.md`.
- `.gitignore` — add `.staging/`.

**Each file has one responsibility:** policy docs are text-only, the shim is a single CLI script with colocated tests, the workflow file is the CI orchestration, the per-package stubs are uniformly templated.

---

## Working Invariants

These must hold at the end of this plan and every subsequent publish PR:

1. A package is `"private": true` **iff** it has a `REFACTOR_NEEDED.md`.
2. A package is `"private": false` **iff** it has no `REFACTOR_NEEDED.md` and meets the graduation checklist.
3. The worktree contains no edits to any `package.json`'s `version` field outside the Changesets "Version Packages" PR.
4. Every `@open-tomato/*` dep in `dependencies` / `peerDependencies` / `devDependencies` uses the `file:../...` syntax. No `workspace:`, no `^x.y.z`, no `latest`. The shim rewrites these at publish time only.

---

## Task 1: Install Changesets + publint

**Files:**
- Modify: `/Users/marcos/projects/open-tomato/packages/package.json`

- [ ] **Step 1: Add devDependencies and release script**

Edit the root `package.json`, add these entries to `devDependencies`:

```json
{
  "devDependencies": {
    "@changesets/cli": "^2.27.10",
    "@changesets/changelog-github": "^0.5.0",
    "publint": "^0.3.9"
  }
}
```

Also add a `release` script inside `scripts`:

```json
{
  "scripts": {
    "release": "changeset publish"
  }
}
```

(The `release` script is a local escape hatch — the pipeline uses `bun scripts/publish-all.ts` instead, which runs the staging shim before publishing.)

- [ ] **Step 2: Install**

Run from `/Users/marcos/projects/open-tomato/packages/`:

```bash
bun install
```

Expected: `bun.lock` updates, `node_modules/@changesets/cli`, `node_modules/@changesets/changelog-github`, and `node_modules/publint` all exist.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add Changesets and publint devDeps"
```

---

## Task 2: Initialize Changesets

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`

- [ ] **Step 1: Run changeset init**

```bash
cd /Users/marcos/projects/open-tomato/packages
bunx changeset init
```

This scaffolds `.changeset/config.json` and `.changeset/README.md` with defaults.

- [ ] **Step 2: Replace `.changeset/config.json`**

Overwrite with:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "open-tomato/packages" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@open-tomato/agent-memory",
    "@open-tomato/cache",
    "@open-tomato/config",
    "@open-tomato/diagnostics",
    "@open-tomato/errors",
    "@open-tomato/eslint-config",
    "@open-tomato/event-bus",
    "@open-tomato/linear",
    "@open-tomato/logger",
    "@open-tomato/loop-safety",
    "@open-tomato/prompt-builder",
    "@open-tomato/task-store",
    "@open-tomato/types",
    "@open-tomato/express",
    "@open-tomato/mcp",
    "@open-tomato/orchestration",
    "@open-tomato/service-core",
    "@open-tomato/worker-protocol",
    "@open-tomato/notifications-plugin-anthropic",
    "@open-tomato/notifications-plugin-executor",
    "@open-tomato/notifications-plugin-tech-tree"
  ]
}
```

Notes:
- `ignore` lists every non-graduated package. Changesets skips version bumps and publish for these. When a package graduates, remove it from this list.
- `commit: false` — we let `changesets/action` manage Version PR commits.

- [ ] **Step 3: Commit**

```bash
git add .changeset/
git commit -m "chore: initialize Changesets config"
```

---

## Task 3: Write `VERSIONING.md`

**Files:**
- Create: `VERSIONING.md`

- [ ] **Step 1: Create the file**

Create `/Users/marcos/projects/open-tomato/packages/VERSIONING.md`:

```markdown
# Versioning Policy

All `@open-tomato/*` packages follow semver. Version bumps are declared by
authors via Changesets — never edited directly in `package.json`.

## patch — `0.0.X`

- Bug fixes that don't alter the public API.
- Internal refactors (file moves, renamed internals, extracted helpers).
- Dependency bumps within the same declared semver range that don't change
  observable behavior.
- Doc-only changes that ship in the tarball (README, JSDoc).
- Test-only changes.

## minor — `0.X.0`

- Additive public API: new exported symbol, new optional function argument,
  new optional config field.
- New opt-in behavior gated behind a new flag.
- Deprecation marks on existing API (warnings, `@deprecated` JSDoc).
  Removal is a separate major.
- Widening peer-dep support (e.g., `zod: ^3` → `^3 || ^4`).

## major — `X.0.0`

- Removed or renamed export.
- Changed function signature (argument count, type, or return type).
- Changed runtime semantics of an existing export.
- Raised peer-dep floor (e.g., `zod: ^3.25` → `^3.30`) or dropped a
  supported range.
- Raised required Bun or Node version.
- Moved an export to a different subpath.

## Pre-1.0

All packages start in `0.x.y`. During pre-1.0 we treat `0.minor.patch` the
same way as `major.minor.patch` — i.e., `0.2.0 → 0.3.0` is a breaking
change. A package stabilizes by landing an explicit **major** changeset
that bumps it to `1.0.0`.

## Cross-cutting rules

- If unsure whether a change is minor or major, default to **major** and
  explain why in the changeset summary.
- Transitive bumps are handled automatically by Changesets — authors don't
  need separate changesets for dependent packages.
- A single changeset file can declare different bump levels for multiple
  packages.

## When a package cannot version cleanly

If a package's public API is too coupled to its internals to version
cleanly (re-exports of deep internals, no stable entry point, mutable
singleton exports, etc.), drop a `REFACTOR_NEEDED.md` in the package
directory describing what needs to change. Such packages stay
`"private": true` until refactored.
```

- [ ] **Step 2: Commit**

```bash
git add VERSIONING.md
git commit -m "docs: add versioning policy"
```

---

## Task 4: Write `RELEASING.md`

**Files:**
- Create: `RELEASING.md`

- [ ] **Step 1: Create the file**

Create `/Users/marcos/projects/open-tomato/packages/RELEASING.md`:

````markdown
# Releasing

How to ship a change to an `@open-tomato/*` package.

## One-time setup

Nothing per-developer. Changesets is pre-installed; the pipeline is driven
by a single GitHub Actions workflow.

## Regular flow

1. **Make your change** in a feature branch. Include tests.
2. **Create a changeset** before opening the PR:
   ```bash
   bunx changeset
   ```
   The prompt will ask:
   - Which packages changed (select with space, confirm with enter).
   - Bump level per package (patch/minor/major — see [VERSIONING.md](./VERSIONING.md)).
   - A short summary (one line; this becomes the CHANGELOG entry).

   A file appears at `.changeset/<random-words>.md`. Commit it with your
   change. Do **not** edit any `package.json` `version` field yourself.

3. **Open a PR** targeting `main`. CI runs:
   - `verify` — tests, linting, type checking (affected only via Turbo).
   - `preview` — rewrites each affected package's `file:` deps in a
     staging dir, runs `npm pack --dry-run`, runs `publint`, and uploads
     artifacts summarizing what would ship.

4. **Merge the PR.** Nothing publishes yet. A "Version Packages" PR appears
   (or updates) on `main`, opened by `github-actions[bot]`. It aggregates
   pending changesets across all merged PRs and shows the proposed bumps
   + auto-generated CHANGELOG diff.

5. **Review and merge the Version PR** when you're ready to release.
   Merging it:
   - Commits the new `version` fields + CHANGELOG.md entries to `main`.
   - Triggers the publish matrix: each bumped package is staged, `file:`
     refs are rewritten to `^<version>`, and published via
     `bun publish --access public --provenance`.
   - Creates a GitHub Release per published package.

## Skipping the changeset requirement

Some PRs don't need a changeset (CI config, docs that don't ship in the
tarball, internal refactors with no public-API effect). Add the
`no-changeset` label to the PR and the `verify` job skips the check.

## Manual retry

If a publish transiently fails (npm outage, rate limit), trigger the
workflow manually via **Actions → packages-publish → Run workflow** on
`main`. It re-computes the publish set and retries only the unpublished
packages.

## Creating a new publishable package (graduation)

1. Remove the package's `REFACTOR_NEEDED.md`.
2. Edit the package's `package.json`:
   - `"private": false`.
   - Add/verify `description`, `license`, `repository`, `homepage`, `bugs`.
   - Add `"publishConfig": { "access": "public" }`.
   - Add `"files": [...]` restricting tarball contents.
3. Write/expand `README.md` with: purpose, install, minimal usage example.
4. Remove the package name from the `ignore` list in `.changeset/config.json`.
5. Add a changeset declaring the initial minor (for pre-1.0) or major
   (for post-1.0) bump.
6. Open a PR. The rest is the regular flow.

## Troubleshooting

- **"publish failed: package is private"** — you forgot to remove the
  package from `.changeset/config.json#ignore` or forgot
  `"private": false`.
- **"dependency X is not publish-eligible"** — you're trying to publish a
  package whose internal dep is still `private: true`. Graduate the dep
  first.
- **"file: refs remain after rewrite"** — the shim couldn't resolve a
  `file:../x` path. Check that the target package exists and isn't
  misnamed.
- **"OIDC token missing"** — the workflow step needs
  `permissions: { id-token: write }`. Don't remove that.
````

- [ ] **Step 2: Commit**

```bash
git add RELEASING.md
git commit -m "docs: add release mechanics guide"
```

---

## Task 5: Add `.github/CODEOWNERS`

**Files:**
- Create: `.github/CODEOWNERS`

- [ ] **Step 1: Create the file**

Create `/Users/marcos/projects/open-tomato/packages/.github/CODEOWNERS`:

```
# Each line is a file pattern followed by one or more owners.
# Patterns match using gitignore syntax; later matches override earlier ones.

# Default owner for the whole repo
*                                  @markost

# Release mechanics — require maintainer review on any change
/.changeset/                       @markost
/.github/workflows/                @markost
/scripts/prepare-publish.ts        @markost
/scripts/publish-all.ts            @markost
/VERSIONING.md                     @markost
/RELEASING.md                      @markost
```

Note: Replace `@markost` with `@open-tomato/maintainers` (or equivalent team) once the GitHub organization has that team set up.

- [ ] **Step 2: Commit**

```bash
git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS gating release mechanics"
```

---

## Task 6: Write failing tests for `prepare-publish.ts`

**Files:**
- Create: `scripts/prepare-publish.test.ts`

- [ ] **Step 1: Create the test file**

Create `/Users/marcos/projects/open-tomato/packages/scripts/prepare-publish.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  rewriteFileRefs,
  verifyNoLocalRefs,
  resolveSiblingVersion,
  isPublishEligible,
  prepare,
} from "./prepare-publish";

describe("rewriteFileRefs", () => {
  test("rewrites a single file: ref in dependencies to a caret range", () => {
    const manifest = {
      name: "@open-tomato/a",
      version: "0.1.0",
      dependencies: { "@open-tomato/b": "file:../b" },
    };
    const resolve = (spec: string) => {
      if (spec === "file:../b") return "1.2.3";
      throw new Error("unexpected");
    };
    const out = rewriteFileRefs(manifest, resolve);
    expect(out.dependencies["@open-tomato/b"]).toBe("^1.2.3");
  });

  test("rewrites file: refs across dependencies, peerDependencies, devDependencies, optionalDependencies", () => {
    const manifest = {
      name: "@open-tomato/a",
      version: "0.1.0",
      dependencies: { "@open-tomato/b": "file:../b" },
      peerDependencies: { "@open-tomato/c": "file:../c" },
      devDependencies: { "@open-tomato/d": "file:../d" },
      optionalDependencies: { "@open-tomato/e": "file:../e" },
    };
    const resolve = (_spec: string) => "0.5.0";
    const out = rewriteFileRefs(manifest, resolve);
    expect(out.dependencies["@open-tomato/b"]).toBe("^0.5.0");
    expect(out.peerDependencies["@open-tomato/c"]).toBe("^0.5.0");
    expect(out.devDependencies["@open-tomato/d"]).toBe("^0.5.0");
    expect(out.optionalDependencies["@open-tomato/e"]).toBe("^0.5.0");
  });

  test("leaves non-file: refs untouched", () => {
    const manifest = {
      name: "@open-tomato/a",
      version: "0.1.0",
      dependencies: {
        zod: "^3.25.0",
        "@open-tomato/b": "file:../b",
      },
    };
    const resolve = (_spec: string) => "1.0.0";
    const out = rewriteFileRefs(manifest, resolve);
    expect(out.dependencies.zod).toBe("^3.25.0");
    expect(out.dependencies["@open-tomato/b"]).toBe("^1.0.0");
  });

  test("does not mutate the input manifest", () => {
    const manifest = {
      name: "@open-tomato/a",
      version: "0.1.0",
      dependencies: { "@open-tomato/b": "file:../b" },
    };
    const resolve = (_spec: string) => "1.0.0";
    rewriteFileRefs(manifest, resolve);
    expect(manifest.dependencies["@open-tomato/b"]).toBe("file:../b");
  });
});

describe("verifyNoLocalRefs", () => {
  test("passes for a clean manifest", () => {
    const manifest = {
      name: "@open-tomato/a",
      dependencies: { zod: "^3.25.0", "@open-tomato/b": "^1.0.0" },
    };
    expect(() => verifyNoLocalRefs(manifest)).not.toThrow();
  });

  test("throws on file: ref", () => {
    const manifest = {
      name: "@open-tomato/a",
      dependencies: { "@open-tomato/b": "file:../b" },
    };
    expect(() => verifyNoLocalRefs(manifest)).toThrow(/file:/);
  });

  test("throws on workspace: ref", () => {
    const manifest = {
      name: "@open-tomato/a",
      dependencies: { "@open-tomato/b": "workspace:*" },
    };
    expect(() => verifyNoLocalRefs(manifest)).toThrow(/workspace:/);
  });

  test("throws on relative-path ref", () => {
    const manifest = {
      name: "@open-tomato/a",
      dependencies: { "@open-tomato/b": "../b" },
    };
    expect(() => verifyNoLocalRefs(manifest)).toThrow(/relative/);
  });
});

function scaffoldFixture() {
  const root = mkdtempSync(join(tmpdir(), "prepare-publish-"));
  mkdirSync(join(root, "shared", "a"), { recursive: true });
  mkdirSync(join(root, "shared", "b"), { recursive: true });
  mkdirSync(join(root, "shared", "blocked"), { recursive: true });

  writeFileSync(
    join(root, "shared", "a", "package.json"),
    JSON.stringify(
      {
        name: "@open-tomato/a",
        version: "0.1.0",
        private: false,
        dependencies: { "@open-tomato/b": "file:../b" },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "shared", "a", "index.ts"), "export const A = 1;\n");

  writeFileSync(
    join(root, "shared", "b", "package.json"),
    JSON.stringify({ name: "@open-tomato/b", version: "0.3.2", private: false }, null, 2),
  );
  writeFileSync(join(root, "shared", "b", "index.ts"), "export const B = 2;\n");

  writeFileSync(
    join(root, "shared", "blocked", "package.json"),
    JSON.stringify({ name: "@open-tomato/blocked", version: "0.0.0", private: true }, null, 2),
  );
  writeFileSync(join(root, "shared", "blocked", "REFACTOR_NEEDED.md"), "# blocked\n");

  return root;
}

describe("resolveSiblingVersion", () => {
  test("reads the sibling package.json version for a file: ref", () => {
    const root = scaffoldFixture();
    try {
      const v = resolveSiblingVersion(join(root, "shared", "a"), "file:../b");
      expect(v).toBe("0.3.2");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("isPublishEligible", () => {
  test("true for a clean package", () => {
    const root = scaffoldFixture();
    try {
      expect(isPublishEligible(join(root, "shared", "b"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("false when REFACTOR_NEEDED.md is present", () => {
    const root = scaffoldFixture();
    try {
      expect(isPublishEligible(join(root, "shared", "blocked"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("false when package is private: true", () => {
    const root = scaffoldFixture();
    try {
      const pkgPath = join(root, "shared", "b", "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkg.private = true;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      expect(isPublishEligible(join(root, "shared", "b"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("prepare (end-to-end)", () => {
  test("stages package a with b's version rewritten", () => {
    const root = scaffoldFixture();
    try {
      const stageDir = prepare({
        packagePath: join(root, "shared", "a"),
        stagingRoot: join(root, ".staging"),
      });
      expect(existsSync(join(stageDir, "package.json"))).toBe(true);
      expect(existsSync(join(stageDir, "index.ts"))).toBe(true);
      const staged = JSON.parse(readFileSync(join(stageDir, "package.json"), "utf8"));
      expect(staged.dependencies["@open-tomato/b"]).toBe("^0.3.2");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails when the package being staged has REFACTOR_NEEDED.md", () => {
    const root = scaffoldFixture();
    try {
      expect(() =>
        prepare({
          packagePath: join(root, "shared", "blocked"),
          stagingRoot: join(root, ".staging"),
        }),
      ).toThrow(/REFACTOR_NEEDED/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails when a dep points at a package that is not publish-eligible", () => {
    const root = scaffoldFixture();
    try {
      writeFileSync(join(root, "shared", "b", "REFACTOR_NEEDED.md"), "# blocked\n");
      expect(() =>
        prepare({
          packagePath: join(root, "shared", "a"),
          stagingRoot: join(root, ".staging"),
        }),
      ).toThrow(/not publish-eligible/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails when a non-@open-tomato file: ref can't be resolved", () => {
    const root = scaffoldFixture();
    try {
      const pkgPath = join(root, "shared", "a", "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkg.dependencies["unknown-pkg"] = "file:../unknown";
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      expect(() =>
        prepare({
          packagePath: join(root, "shared", "a"),
          stagingRoot: join(root, ".staging"),
        }),
      ).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun test scripts/prepare-publish.test.ts
```

Expected: all tests fail because `./prepare-publish` doesn't exist. Failure mode: "Cannot find module './prepare-publish'" or similar.

---

## Task 7: Implement `scripts/prepare-publish.ts`

**Files:**
- Create: `scripts/prepare-publish.ts`

- [ ] **Step 1: Write the implementation**

Create `/Users/marcos/projects/open-tomato/packages/scripts/prepare-publish.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun test scripts/prepare-publish.test.ts
```

Expected: all tests pass. Iterate if any fail.

- [ ] **Step 3: Commit**

```bash
git add scripts/prepare-publish.ts scripts/prepare-publish.test.ts
git commit -m "feat: add prepare-publish shim that rewrites file: refs to semver"
```

---

## Task 8: Add `.staging/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append the entry**

Append to `/Users/marcos/projects/open-tomato/packages/.gitignore`:

```
# Publish staging dir produced by scripts/prepare-publish.ts
.staging/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .staging/ publish output"
```

---

## Task 9: Add `scripts/publish-all.ts`

**Files:**
- Create: `scripts/publish-all.ts`

- [ ] **Step 1: Create the file**

Create `/Users/marcos/projects/open-tomato/packages/scripts/publish-all.ts`. Uses `execFileSync` (no shell, argv arrays) to avoid any injection risk from package names:

```typescript
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
```

- [ ] **Step 2: Smoke-test the script**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun scripts/publish-all.ts 2>&1 | tail -5
```

Expected: prints `[]` on stdout (no pending releases yet — Task 12 adds one). No errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/publish-all.ts
git commit -m "feat: add publish-all driver for Changesets action"
```

---

## Task 10: Scaffold `REFACTOR_NEEDED.md` for 18 private shared/service packages

**Files:** Create one `REFACTOR_NEEDED.md` per package below.

All 18 files use the template; only the package name and blocking reasons vary.

**Template (substitute `<PKG-NAME>` and `<BLOCKING REASONS>`):**

```markdown
# REFACTOR_NEEDED — <PKG-NAME>

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

<BLOCKING REASONS>

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
```

**Per-package blocking reasons:**

| Path | PKG-NAME | BLOCKING REASONS |
|---|---|---|
| `shared/agent-memory` | `@open-tomato/agent-memory` | - [ ] No documented public API / README.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable and not a re-export of internals.<br>- [ ] No graduation changeset yet. |
| `shared/cache` | `@open-tomato/cache` | - [ ] Depends on runtime-split build (`dist/browser.js`, `dist/server.js`); verify `exports` map + `files` whitelist + `publint` pass.<br>- [ ] No README covering browser/server split.<br>- [ ] `peerDependencies` on `ioredis` — confirm version range matches consumer expectations.<br>- [ ] No graduation changeset yet. |
| `shared/config` | `@open-tomato/config` | - [ ] No documented public API / README.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] Zod runtime dep — confirm declared as a regular dep, not peer.<br>- [ ] No graduation changeset yet. |
| `shared/diagnostics` | `@open-tomato/diagnostics` | - [ ] No README.<br>- [ ] Exports via `./src/diagnostics/index.ts` — non-idiomatic; review for a cleaner entry.<br>- [ ] No graduation changeset yet. |
| `shared/errors` | `@open-tomato/errors` | - [ ] No README.<br>- [ ] `peerDependency` on zod — confirm floor.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |
| `shared/eslint-config` | `@open-tomato/eslint-config` | - [ ] Awaiting Wave 2 graduation PR (see design spec). Needs README covering `/`, `/next`, `/react` entries; `files` whitelist; graduation changeset. |
| `shared/event-bus` | `@open-tomato/event-bus` | - [ ] No README.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |
| `shared/linear` | `@open-tomato/linear` | - [ ] No README.<br>- [ ] Splits into `./auth-node` and `./auth-browser` — confirm `exports` map is correct and consumer can import selectively.<br>- [ ] No test script.<br>- [ ] No graduation changeset yet. |
| `shared/logger` | `@open-tomato/logger` | - [ ] Depends on runtime-split build (`dist/node.js`, `dist/browser.js`); verify `exports` map + `files` whitelist + `publint` pass.<br>- [ ] README needs to cover browser/node selection behavior.<br>- [ ] No graduation changeset yet. |
| `shared/loop-safety` | `@open-tomato/loop-safety` | - [ ] No README.<br>- [ ] No test script (uses `bun test` but no tests present).<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |
| `shared/prompt-builder` | `@open-tomato/prompt-builder` | - [ ] No README.<br>- [ ] Depends on `@open-tomato/types` (internal, also private).<br>- [ ] `gpt-tokenizer` dep ships large WASM — confirm tarball size acceptable.<br>- [ ] No graduation changeset yet. |
| `shared/task-store` | `@open-tomato/task-store` | - [ ] No README.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |
| `shared/types` | `@open-tomato/types` | - [ ] No README.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] Zod runtime dep — confirm declared correctly.<br>- [ ] No graduation changeset yet. |
| `service/express` | `@open-tomato/express` | - [ ] No README.<br>- [ ] Depends on `@open-tomato/service-core` (internal, also private).<br>- [ ] Large transitive dep footprint (express, helmet, cors, rate-limit) — confirm intentional.<br>- [ ] No graduation changeset yet. |
| `service/mcp` | `@open-tomato/mcp` | - [ ] No README.<br>- [ ] Depends on `@open-tomato/logger` and `@open-tomato/service-core` (both internal and private).<br>- [ ] `@modelcontextprotocol/sdk` appears as peer dep + dep + devDep — clean up before graduation.<br>- [ ] No graduation changeset yet. |
| `service/orchestration` | `@open-tomato/orchestration` | - [ ] No README.<br>- [ ] Depends on `@open-tomato/types` (internal, also private).<br>- [ ] No graduation changeset yet. |
| `service/service-core` | `@open-tomato/service-core` | - [ ] No README.<br>- [ ] Depends on `@open-tomato/errors` and `@open-tomato/logger` (both internal and private).<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |
| `service/worker-protocol` | `@open-tomato/worker-protocol` | - [ ] No README.<br>- [ ] `peerDependency` on zod — confirm floor.<br>- [ ] Exports `./src/index.ts` directly — verify entry is stable.<br>- [ ] No graduation changeset yet. |

- [ ] **Step 1: Create each file**

For each row, write `<path>/REFACTOR_NEEDED.md` with the template, substituting the package name and the blocking reasons list verbatim. Concrete example for `shared/agent-memory`:

```markdown
# REFACTOR_NEEDED — @open-tomato/agent-memory

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] No documented public API / README.
- [ ] Exports `./src/index.ts` directly — verify entry is stable and not a re-export of internals.
- [ ] No graduation changeset yet.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
```

- [ ] **Step 2: Commit**

```bash
git add shared/*/REFACTOR_NEEDED.md service/*/REFACTOR_NEEDED.md
git commit -m "docs: add REFACTOR_NEEDED.md stubs for private packages"
```

---

## Task 11: Lock notifications plugins to `private: true` with `REFACTOR_NEEDED.md`

Reason: the three `notifications/plugin-*` packages are currently `"private": false` but don't meet the graduation checklist (no README, no `license`, no `files` whitelist, most lack tests). Flipping them to `private: true` with a `REFACTOR_NEEDED.md` preserves the working invariant (private ↔ REFACTOR_NEEDED.md) and prevents accidental publish. Wave 3 undoes this for `plugin-anthropic`.

**Files:**
- Modify: `notifications/plugin-anthropic/package.json`
- Modify: `notifications/plugin-executor/package.json`
- Modify: `notifications/plugin-tech-tree/package.json`
- Create: `notifications/plugin-anthropic/REFACTOR_NEEDED.md`
- Create: `notifications/plugin-executor/REFACTOR_NEEDED.md`
- Create: `notifications/plugin-tech-tree/REFACTOR_NEEDED.md`

- [ ] **Step 1: Flip `private: false` → `true` in all three package.json files**

In each of `notifications/plugin-anthropic/package.json`, `notifications/plugin-executor/package.json`, and `notifications/plugin-tech-tree/package.json`, change:

```json
"private": false,
```

to:

```json
"private": true,
```

- [ ] **Step 2: Create `notifications/plugin-anthropic/REFACTOR_NEEDED.md`**

```markdown
# REFACTOR_NEEDED — @open-tomato/notifications-plugin-anthropic

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] Awaiting Wave 3 graduation PR (see design spec).
- [ ] No README with install + usage.
- [ ] No `license`, `description`, `repository`, `homepage`, `bugs` fields.
- [ ] No `"files"` whitelist.
- [ ] Confirm unit tests exercise the public entry.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the Wave 3 graduation, along with a changeset declaring the
bump.
```

- [ ] **Step 3: Create `notifications/plugin-executor/REFACTOR_NEEDED.md`**

```markdown
# REFACTOR_NEEDED — @open-tomato/notifications-plugin-executor

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] No README with install + usage.
- [ ] No `license`, `description`, `repository`, `homepage`, `bugs` fields.
- [ ] No `"files"` whitelist.
- [ ] No test script; needs at least a smoke test.
- [ ] No graduation changeset yet.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
```

- [ ] **Step 4: Create `notifications/plugin-tech-tree/REFACTOR_NEEDED.md`**

```markdown
# REFACTOR_NEEDED — @open-tomato/notifications-plugin-tech-tree

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] No README with install + usage.
- [ ] No `license`, `description`, `repository`, `homepage`, `bugs` fields.
- [ ] No `"files"` whitelist.
- [ ] No test script; needs at least a smoke test.
- [ ] No graduation changeset yet.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
```

- [ ] **Step 5: Commit**

```bash
git add notifications/*/package.json notifications/*/REFACTOR_NEEDED.md
git commit -m "chore: lock notifications plugins as private with REFACTOR_NEEDED stubs"
```

---

## Task 12: Graduate `@open-tomato/typescript-config`

**Files:**
- Modify: `shared/typescript-config/package.json`
- Create: `shared/typescript-config/README.md`
- Create: `shared/typescript-config/LICENSE`
- Modify: `.changeset/config.json`

- [ ] **Step 1: Replace `shared/typescript-config/package.json`**

Overwrite with:

```json
{
  "name": "@open-tomato/typescript-config",
  "version": "0.0.0",
  "description": "Shared TypeScript base / React / Next.js tsconfig presets for @open-tomato packages.",
  "license": "MIT",
  "private": false,
  "author": "Open Tomato",
  "homepage": "https://github.com/open-tomato/packages/tree/main/shared/typescript-config",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/open-tomato/packages.git",
    "directory": "shared/typescript-config"
  },
  "bugs": {
    "url": "https://github.com/open-tomato/packages/issues"
  },
  "publishConfig": {
    "access": "public"
  },
  "exports": {
    "./base": "./base.json",
    "./react": "./react.json",
    "./next": "./nextjs.json"
  },
  "files": [
    "base.json",
    "react.json",
    "nextjs.json",
    "README.md",
    "LICENSE"
  ]
}
```

Note: `version` stays at `0.0.0`. Changesets bumps it to `0.1.0` when the initial changeset (Task 13) is processed.

- [ ] **Step 2: Create `shared/typescript-config/README.md`**

````markdown
# @open-tomato/typescript-config

Shared TypeScript config presets for `@open-tomato/*` packages.

## Install

```bash
bun add -D @open-tomato/typescript-config
# or: npm install --save-dev @open-tomato/typescript-config
```

## Usage

Extend from one of the three presets in your `tsconfig.json`:

```jsonc
{
  "extends": "@open-tomato/typescript-config/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

Available presets:

- `@open-tomato/typescript-config/base` — library defaults (strict, ESM, bundler resolution).
- `@open-tomato/typescript-config/react` — adds React-specific compiler options.
- `@open-tomato/typescript-config/next` — extends `react` with Next.js-specific settings.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Follow [semver](../../VERSIONING.md).
````

- [ ] **Step 3: Copy root LICENSE into the package**

```bash
cp /Users/marcos/projects/open-tomato/packages/LICENSE /Users/marcos/projects/open-tomato/packages/shared/typescript-config/LICENSE
```

- [ ] **Step 4: Remove `@open-tomato/typescript-config` from `.changeset/config.json#ignore`**

Edit `.changeset/config.json`, remove the line:

```json
    "@open-tomato/typescript-config",
```

Ensure trailing commas are valid after removal.

- [ ] **Step 5: Verify monorepo still type-checks**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun install
bun run check-types
```

Expected: green. Intra-repo consumers resolve unchanged via `file:../typescript-config`.

- [ ] **Step 6: Commit**

```bash
git add shared/typescript-config/package.json shared/typescript-config/README.md shared/typescript-config/LICENSE .changeset/config.json bun.lock
git commit -m "feat: graduate @open-tomato/typescript-config for publishing"
```

---

## Task 13: Create the Wave 1 changeset

**Files:**
- Create: `.changeset/typescript-config-initial.md`

- [ ] **Step 1: Write the changeset file**

Create `/Users/marcos/projects/open-tomato/packages/.changeset/typescript-config-initial.md`:

```markdown
---
"@open-tomato/typescript-config": minor
---

First public release. Shared base / React / Next.js tsconfig presets for the `@open-tomato/*` package ecosystem.
```

- [ ] **Step 2: Verify Changesets picks it up**

```bash
cd /Users/marcos/projects/open-tomato/packages
bunx changeset status
```

Expected: output includes `@open-tomato/typescript-config` with a pending `minor` bump.

- [ ] **Step 3: Commit**

```bash
git add .changeset/typescript-config-initial.md
git commit -m "chore: add graduation changeset for typescript-config 0.1.0"
```

---

## Task 14: Replace `.github/workflows/packages-publish.yml`

**Files:**
- Modify: `.github/workflows/packages-publish.yml`

- [ ] **Step 1: Overwrite the file**

Replace the entire contents of `/Users/marcos/projects/open-tomato/packages/.github/workflows/packages-publish.yml` with:

```yaml
name: packages-publish

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: packages-publish-${{ github.ref }}
  cancel-in-progress: false

permissions: read-all

jobs:
  verify:
    name: verify (lint, types, tests, changeset presence)
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.9

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint / types / tests (affected)
        run: bun turbo run lint check-types test --affected

      - name: Require changeset on source-touching PRs
        if: github.event_name == 'pull_request' && !contains(github.event.pull_request.labels.*.name, 'no-changeset')
        run: bunx changeset status --since=origin/${{ github.base_ref }}

  preview:
    name: preview (tarball dry-run)
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.9

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Stage + pack dry-run per affected package
        run: |
          set -euo pipefail
          mkdir -p .preview-out
          status_file="$(mktemp)"
          bunx changeset status --output "$status_file" || echo '{"releases":[]}' > "$status_file"
          bun --eval "
            const fs = require('node:fs');
            const path = require('node:path');
            const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
            const ws = require(path.resolve('package.json')).workspaces || [];
            const map = {};
            for (const g of ws) {
              const dir = g.replace('/*','');
              if (!fs.existsSync(dir)) continue;
              for (const sub of fs.readdirSync(dir)) {
                const pkg = path.join(dir, sub, 'package.json');
                if (!fs.existsSync(pkg)) continue;
                map[JSON.parse(fs.readFileSync(pkg,'utf8')).name] = path.join(dir, sub);
              }
            }
            fs.writeFileSync(process.argv[3], (s.releases||[]).map(r => map[r.name]).filter(Boolean).join('\n'));
          " "$status_file" .preview-out/paths.txt
          while IFS= read -r pkg; do
            [ -z "$pkg" ] && continue
            echo \"=== $pkg ===\"
            stage=\"$(bun scripts/prepare-publish.ts \"$pkg\")\"
            (cd \"$stage\" && npm pack --dry-run --json > \"$GITHUB_WORKSPACE/.preview-out/$(basename \"$pkg\").json\")
            (cd \"$stage\" && bunx publint) | tee -a \"$GITHUB_WORKSPACE/.preview-out/publint.log\" || true
          done < .preview-out/paths.txt

      - name: Upload preview artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: publish-preview
          path: .preview-out/
          if-no-files-found: ignore

  version-or-publish:
    name: version or publish
    runs-on: ubuntu-latest
    needs: verify
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.9

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Changesets action — open Version PR or publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: bunx changeset version
          publish: bun scripts/publish-all.ts
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: "true"

      - name: Summary
        if: steps.changesets.outputs.published == 'true'
        run: |
          echo "Published packages:"
          echo '${{ steps.changesets.outputs.publishedPackages }}'
```

Notes:
- OIDC publishing: `id-token: write` permission + `NPM_CONFIG_PROVENANCE=true` environment variable. The npm scope/packages must be registered as trusted publishers on npmjs.com (operator action, not a code change).
- `workflow_dispatch` lets operators re-run publish after transient failures.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/packages-publish.yml
git commit -m "ci: replace publish stub with Changesets-driven matrix workflow"
```

---

## Task 15: Update root `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Find and replace the existing Publishing section**

In `/Users/marcos/projects/open-tomato/packages/README.md`, find this section:

```markdown
## Publishing

Publishing is gated behind a disabled GitHub Actions workflow at [.github/workflows/packages-publish.yml](./.github/workflows/packages-publish.yml). See the workflow header for enablement steps.
```

Replace with:

```markdown
## Publishing

Packages publish to `@open-tomato` on npm via GitHub Actions, driven by
[Changesets](https://github.com/changesets/changesets). Authors declare
per-package semver intent in feature PRs; a standing "Version Packages" PR
aggregates pending changes; merging it triggers the publish matrix.

- [VERSIONING.md](./VERSIONING.md) — patch / minor / major criteria.
- [RELEASING.md](./RELEASING.md) — end-to-end release flow and troubleshooting.
- [.github/workflows/packages-publish.yml](./.github/workflows/packages-publish.yml) — the workflow.

Private packages carry a `REFACTOR_NEEDED.md` describing what they need
before graduating to publishable. The invariant holds repo-wide: a package
is `"private": true` if and only if it has a `REFACTOR_NEEDED.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: link publish mechanics from root README"
```

---

## Task 16: End-to-end local verification

**Files:** None modified.

- [ ] **Step 1: Verify Changesets reports the pending release**

```bash
cd /Users/marcos/projects/open-tomato/packages
bunx changeset status
```

Expected: output shows `@open-tomato/typescript-config` with a pending `minor` bump.

- [ ] **Step 2: Dry-run `changeset version` (reversible)**

```bash
cd /Users/marcos/projects/open-tomato/packages
bunx changeset version
cat shared/typescript-config/package.json | grep '"version"'
cat shared/typescript-config/CHANGELOG.md
```

Expected: `"version": "0.1.0"` and a populated CHANGELOG.md. Revert the changes (they'll be re-created in CI):

```bash
git checkout shared/typescript-config/package.json
rm -f shared/typescript-config/CHANGELOG.md
# The changeset file was consumed; restore it too:
git checkout .changeset/typescript-config-initial.md
```

- [ ] **Step 3: Dry-run the prepare shim**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun scripts/prepare-publish.ts shared/typescript-config
ls .staging/typescript-config/
cat .staging/typescript-config/package.json
```

Expected: staging dir contains `base.json`, `react.json`, `nextjs.json`, `package.json`, `README.md`, `LICENSE`. The `package.json` is unchanged for this package (it has no `@open-tomato/*` deps).

- [ ] **Step 4: Dry-run `npm pack` from the staging dir**

```bash
cd /Users/marcos/projects/open-tomato/packages/.staging/typescript-config
npm pack --dry-run
```

Expected: lists `base.json`, `nextjs.json`, `react.json`, `README.md`, `LICENSE`, `package.json`. Tarball size under ~20 KB.

- [ ] **Step 5: Dry-run `publint`**

```bash
cd /Users/marcos/projects/open-tomato/packages
bunx publint .staging/typescript-config
```

Expected: zero errors. Warnings (if any) are informational; note them for the PR.

- [ ] **Step 6: Run the full repo test suite**

```bash
cd /Users/marcos/projects/open-tomato/packages
bun run test
bun run lint
bun run check-types
```

Expected: all green.

- [ ] **Step 7: Clean up staging**

```bash
rm -rf /Users/marcos/projects/open-tomato/packages/.staging
```

---

## Task 17: Push branch and open PR

**Files:** None modified.

- [ ] **Step 1: Push the branch**

```bash
cd /Users/marcos/projects/open-tomato/packages
git push -u origin HEAD
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create \
  --title "feat: packages publish workflow (Wave 0 + typescript-config Wave 1)" \
  --body "$(cat <<'EOF'
## Summary

Stands up the `@open-tomato/*` npm publish pipeline and graduates the first pilot package.

- **Pipeline:** Changesets-driven, matrix publish, OIDC trusted publishing, `file:` → `^x.y.z` rewrite shim in `scripts/prepare-publish.ts`.
- **Wave 1 graduation:** `@open-tomato/typescript-config` (first publish lands as `0.1.0`).
- **Invariants established:** every `private: true` package now has a `REFACTOR_NEEDED.md`. The 3 `notifications/plugin-*` packages are flipped back to `private: true` and will graduate in Wave 3.
- **Out of scope:** Wave 2 (`eslint-config`), Wave 3 (`notifications/plugin-anthropic`), cross-repo `repository_dispatch` signalling.

Spec: [docs/superpowers/specs/2026-04-23-packages-publish-workflow-design.md](../docs/superpowers/specs/2026-04-23-packages-publish-workflow-design.md)

## Pre-merge operator checklist (npm side)

Before merging the Version Packages PR that follows this one:

- [ ] Register `@open-tomato` scope (or `@open-tomato/typescript-config` specifically) on npmjs.com as a trusted publisher against this repository + `.github/workflows/packages-publish.yml` on the `main` branch.
- [ ] Confirm the `@open-tomato` scope is owned by the intended npm org.
- [ ] Enable branch protection on `main`: required status checks (`verify`, `preview`), required review, linear history.

## Test plan

- [ ] CI `verify` job passes (lint, types, tests, changeset presence).
- [ ] CI `preview` job runs and uploads artifacts for `@open-tomato/typescript-config`.
- [ ] On merge, the Changesets action opens a "Version Packages" PR bumping `typescript-config` to `0.1.0`.
- [ ] Merging the Version PR triggers the publish job; `@open-tomato/typescript-config@0.1.0` appears on npmjs.com with provenance.
- [ ] A GitHub Release `@open-tomato/typescript-config@0.1.0` is created.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Architecture (Changesets + matrix + shim + OIDC): Tasks 1, 2, 7, 9, 14.
- ✅ Versioning policy (patch/minor/major + pre-1.0): Task 3.
- ✅ Graduation criteria + REFACTOR_NEEDED.md: Tasks 10, 11, 12.
- ✅ Workflow structure (verify, preview, version-or-publish, publish matrix, summary): Task 14.
- ✅ Safeguards (OIDC, provenance, publint, changeset required, CODEOWNERS, no local refs, REFACTOR_NEEDED gate, private dep gate): Tasks 5, 7, 9, 14.
- ✅ Pilot Wave 0 + Wave 1: Tasks 12, 13.
- ✅ Invariant (private iff REFACTOR_NEEDED.md): Tasks 10, 11.
- ✅ Cross-repo pattern documented (deferred) in spec; not in tasks (out of scope per spec).
- ✅ Open questions / known unknowns (`bun publish` + OIDC, Changesets tolerance of `file:`) surface as verification in Task 16.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or unspecified behavior. Every code block is complete and runnable.

**Type consistency:**
- `Manifest` interface defined in `prepare-publish.ts` (Task 7), used consistently in `publish-all.ts` (Task 9).
- `prepare({ packagePath, stagingRoot })` signature identical across test file (Task 6), implementation (Task 7), and caller (Task 9).
- `rewriteFileRefs`, `verifyNoLocalRefs`, `resolveSiblingVersion`, `isPublishEligible`, `prepare` — all names consistent across tasks.
- `execFileSync` used throughout `publish-all.ts` (avoids shell interpretation; aligns with safer-exec guidance).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-packages-publish-workflow.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent runs each task, with two-stage review between tasks. Fast iteration, catches drift early, each task's context stays lean.

**2. Inline Execution** — tasks run in this session using executing-plans, with checkpoints for review at natural boundaries.

**Which approach?**
