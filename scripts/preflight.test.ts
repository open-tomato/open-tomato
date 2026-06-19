import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isValidSemver,
  checkRegistry,
  checkManifests,
  checkNoFileRefs,
  findUncoveredPackages,
  changedPackages,
  publishedRange,
  checkLocalRefsAndDeprecation,
  runPreflight,
} from "./preflight";
import {
  isPublicRegistryUrl,
  parseScopeRegistry,
  resolveScopeRegistry,
} from "./registry";
import { expectedPackageName, type PackageInfo } from "./workspace";

function pkg(overrides: Partial<PackageInfo>): PackageInfo {
  return {
    name: "@open-tomato/x",
    dir: "/abs/shared/x",
    relDir: "shared/x",
    group: "shared",
    basename: "x",
    version: "0.1.0",
    private: false,
    eligible: true,
    manifest: { name: "@open-tomato/x", version: "0.1.0" },
    ...overrides,
  };
}

describe("registry helpers", () => {
  test("classifies public registries", () => {
    expect(isPublicRegistryUrl("https://registry.npmjs.org/")).toBe(true);
    expect(isPublicRegistryUrl("https://npm.pkg.github.com/")).toBe(true);
    expect(isPublicRegistryUrl("https://registry.yarnpkg.com/")).toBe(true);
    expect(isPublicRegistryUrl("https://npm.heimdall.bifemecanico.com/")).toBe(false);
  });

  test("parses scope registry, ignoring comments", () => {
    const npmrc = `# comment\n@open-tomato:registry=https://npm.heimdall.bifemecanico.com/\n`;
    expect(parseScopeRegistry(npmrc, "@open-tomato")).toBe(
      "https://npm.heimdall.bifemecanico.com/",
    );
    expect(parseScopeRegistry(npmrc, "@bifemecanico")).toBeUndefined();
  });

  test("resolves across files, most-specific first", () => {
    const root = mkdtempSync(join(tmpdir(), "npmrc-"));
    try {
      writeFileSync(join(root, ".npmrc"), "@open-tomato:registry=https://local/\n");
      const url = resolveScopeRegistry(
        [join(root, ".npmrc"), join(root, "missing.npmrc")],
        "@open-tomato",
      );
      expect(url).toBe("https://local/");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("isValidSemver", () => {
  test("accepts valid versions", () => {
    for (const v of ["0.0.0", "1.2.3", "0.1.0", "1.0.0-rc.1", "2.3.4+build.5"]) {
      expect(isValidSemver(v)).toBe(true);
    }
  });
  test("rejects invalid versions", () => {
    for (const v of ["1.2", "v1.2.3", "1.2.3.4", "latest", "^1.0.0", ""]) {
      expect(isValidSemver(v)).toBe(false);
    }
  });
});

describe("expectedPackageName", () => {
  test("shared/service keep only the basename", () => {
    expect(expectedPackageName("shared", "logger")).toBe("@open-tomato/logger");
    expect(expectedPackageName("service", "express")).toBe("@open-tomato/express");
  });
  test("notifications flatten the group into the name", () => {
    expect(expectedPackageName("notifications", "plugin-anthropic")).toBe(
      "@open-tomato/notifications-plugin-anthropic",
    );
  });
  test("direct (no group) uses the basename", () => {
    expect(expectedPackageName("", "ui-skeleton")).toBe("@open-tomato/ui-skeleton");
  });
});

describe("checkRegistry", () => {
  test("errors when a scope is unpinned", () => {
    const root = mkdtempSync(join(tmpdir(), "reg-"));
    try {
      writeFileSync(join(root, ".npmrc"), "@open-tomato:registry=https://npm.heimdall.bifemecanico.com/\n");
      const findings = checkRegistry([join(root, ".npmrc")], []);
      // @bifemecanico is unpinned here.
      expect(findings.some((f) => f.message.includes("@bifemecanico"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("errors when a package publishConfig.registry is public", () => {
    const findings = checkRegistry([], [
      pkg({
        manifest: {
          name: "@open-tomato/x",
          version: "0.1.0",
          publishConfig: { registry: "https://registry.npmjs.org/" },
        },
      }),
    ]);
    expect(findings.some((f) => f.message.includes("PUBLIC"))).toBe(true);
  });
});

describe("checkManifests", () => {
  test("flags invalid semver and name mismatch", () => {
    const findings = checkManifests([
      pkg({ name: "@open-tomato/wrong", basename: "logger", version: "1.2" }),
    ]);
    expect(findings.some((f) => f.check === "semver")).toBe(true);
    expect(findings.some((f) => f.check === "naming")).toBe(true);
  });

  test("passes for a conventional manifest", () => {
    const findings = checkManifests([
      pkg({ name: "@open-tomato/logger", basename: "logger", version: "0.1.0" }),
    ]);
    expect(findings).toHaveLength(0);
  });
});

describe("checkNoFileRefs", () => {
  test("errors on a file: internal ref", () => {
    const findings = checkNoFileRefs([
      pkg({
        relDir: "shared/a",
        manifest: {
          name: "@open-tomato/a",
          version: "0.1.0",
          devDependencies: { "@open-tomato/typescript-config": "file:../typescript-config" },
        },
      }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.check).toBe("no-file-refs");
    expect(findings[0]!.level).toBe("error");
  });

  test("passes for workspace: refs", () => {
    const findings = checkNoFileRefs([
      pkg({
        manifest: {
          name: "@open-tomato/a",
          version: "0.1.0",
          dependencies: { "@open-tomato/types": "workspace:^" },
        },
      }),
    ]);
    expect(findings).toHaveLength(0);
  });
});

describe("changed-must-bump", () => {
  test("changedPackages matches by relDir prefix", () => {
    const pkgs = [pkg({ relDir: "shared/logger" }), pkg({ relDir: "shared/types" })];
    const changed = changedPackages(pkgs, ["shared/logger/src/index.ts"]);
    expect(changed).toHaveLength(1);
    expect(changed[0]!.relDir).toBe("shared/logger");
  });

  test("findUncoveredPackages returns changed-but-not-bumped", () => {
    const changed = [
      pkg({ name: "@open-tomato/a" }),
      pkg({ name: "@open-tomato/b" }),
    ];
    const uncovered = findUncoveredPackages(changed, new Set(["@open-tomato/a"]));
    expect(uncovered).toEqual(["@open-tomato/b"]);
  });
});

describe("publishedRange", () => {
  test("file: and workspace: refs resolve to caret of sibling version", () => {
    const index = { "@open-tomato/types": { version: "0.4.0" } };
    expect(publishedRange("file:../types", index, "@open-tomato/types")).toBe("^0.4.0");
    expect(publishedRange("workspace:^", index, "@open-tomato/types")).toBe("^0.4.0");
    expect(publishedRange("workspace:*", index, "@open-tomato/types")).toBe("0.4.0");
  });
  test("plain ranges pass through", () => {
    expect(publishedRange("^1.2.3", {}, "@open-tomato/x")).toBe("^1.2.3");
  });
});

describe("checkLocalRefsAndDeprecation", () => {
  function scaffold() {
    const root = mkdtempSync(join(tmpdir(), "preflight-e2e-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "@open-tomato/root", private: true, workspaces: ["shared/*"] }),
    );
    mkdirSync(join(root, "shared", "a"), { recursive: true });
    mkdirSync(join(root, "shared", "types"), { recursive: true });
    writeFileSync(
      join(root, "shared", "types", "package.json"),
      JSON.stringify({ name: "@open-tomato/types", version: "0.4.0", private: false }),
    );
    return root;
  }

  test("flags a dep on a non-eligible (private) sibling", () => {
    const root = scaffold();
    try {
      writeFileSync(
        join(root, "shared", "types", "package.json"),
        JSON.stringify({ name: "@open-tomato/types", version: "0.4.0", private: true }),
      );
      const consumer = pkg({
        name: "@open-tomato/a",
        dir: join(root, "shared", "a"),
        relDir: "shared/a",
        manifest: {
          name: "@open-tomato/a",
          version: "0.1.0",
          dependencies: { "@open-tomato/types": "workspace:^" },
        },
      });
      const findings = checkLocalRefsAndDeprecation(root, [consumer], null);
      expect(findings.some((f) => f.check === "local-refs")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("flags a deprecated internal dependency via the injected resolver", () => {
    const root = scaffold();
    try {
      const consumer = pkg({
        name: "@open-tomato/a",
        dir: join(root, "shared", "a"),
        relDir: "shared/a",
        manifest: {
          name: "@open-tomato/a",
          version: "0.1.0",
          dependencies: { "@open-tomato/types": "workspace:^" },
        },
      });
      const findings = checkLocalRefsAndDeprecation(root, [consumer], (name, range) => ({
        version: "0.4.0",
        deprecated: `do not use ${name}@${range}`,
      }));
      expect(findings.some((f) => f.check === "deprecation")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("no findings for a clean eligible dep, no deprecation", () => {
    const root = scaffold();
    try {
      const consumer = pkg({
        name: "@open-tomato/a",
        dir: join(root, "shared", "a"),
        relDir: "shared/a",
        manifest: {
          name: "@open-tomato/a",
          version: "0.1.0",
          dependencies: { "@open-tomato/types": "workspace:^" },
        },
      });
      const findings = checkLocalRefsAndDeprecation(root, [consumer], () => null);
      expect(findings).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("runPreflight (integration of pure parts)", () => {
  test("warns (not errors) when git base is unavailable", () => {
    const root = mkdtempSync(join(tmpdir(), "preflight-run-"));
    try {
      writeFileSync(
        join(root, ".npmrc"),
        "@open-tomato:registry=https://npm.heimdall.bifemecanico.com/\n@bifemecanico:registry=https://npm.heimdall.bifemecanico.com/\n",
      );
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "@open-tomato/root", private: true, workspaces: ["shared/*"] }),
      );
      mkdirSync(join(root, "shared", "logger"), { recursive: true });
      writeFileSync(
        join(root, "shared", "logger", "package.json"),
        JSON.stringify({ name: "@open-tomato/logger", version: "0.1.0", private: false }),
      );
      const report = runPreflight({
        root,
        npmrcPaths: [join(root, ".npmrc")],
        changedRelPaths: null,
        lookupDeprecation: null,
      });
      expect(report.ok).toBe(true);
      expect(report.findings.some((f) => f.level === "warning" && f.check === "changesets")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
