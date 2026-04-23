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
