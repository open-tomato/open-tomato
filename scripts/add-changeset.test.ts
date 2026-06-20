import { describe, expect, test } from "bun:test";
import {
  isLevel,
  parsePkgArg,
  buildChangesetContent,
  slugFor,
  resolveEntries,
} from "./add-changeset";
import type { PackageInfo } from "./workspace";

function pkg(name: string, eligible = true): PackageInfo {
  return {
    name,
    dir: `/abs/${name}`,
    relDir: `shared/${name.split("/")[1]}`,
    group: "shared",
    basename: name.split("/")[1]!,
    version: "0.1.0",
    private: !eligible,
    eligible,
    manifest: { name, version: "0.1.0" },
  };
}

describe("isLevel", () => {
  test("accepts valid, rejects invalid", () => {
    expect(isLevel("patch")).toBe(true);
    expect(isLevel("minor")).toBe(true);
    expect(isLevel("major")).toBe(true);
    expect(isLevel("breaking")).toBe(false);
    expect(isLevel("")).toBe(false);
  });
});

describe("parsePkgArg", () => {
  test("splits a trailing :level but keeps the scope", () => {
    expect(parsePkgArg("@open-tomato/logger:minor")).toEqual({
      name: "@open-tomato/logger",
      level: "minor",
    });
  });
  test("no level when absent", () => {
    expect(parsePkgArg("@open-tomato/logger")).toEqual({ name: "@open-tomato/logger" });
  });
});

describe("buildChangesetContent", () => {
  test("renders frontmatter + summary", () => {
    const out = buildChangesetContent(
      [
        { name: "@open-tomato/logger", level: "minor" },
        { name: "@open-tomato/errors", level: "patch" },
      ],
      "  add child() logger  ",
    );
    expect(out).toBe(
      `---\n"@open-tomato/logger": minor\n"@open-tomato/errors": patch\n---\n\nadd child() logger\n`,
    );
  });
});

describe("slugFor", () => {
  test("is deterministic and readable", () => {
    const entries = [{ name: "@open-tomato/logger", level: "minor" as const }];
    const a = slugFor(entries, "add child()");
    const b = slugFor(entries, "add child()");
    expect(a).toBe(b);
    expect(a.startsWith("logger-")).toBe(true);
  });
  test("differs when content differs", () => {
    const entries = [{ name: "@open-tomato/logger", level: "patch" as const }];
    expect(slugFor(entries, "a")).not.toBe(slugFor(entries, "b"));
  });
});

describe("resolveEntries", () => {
  const packages = [
    pkg("@open-tomato/logger"),
    pkg("@open-tomato/errors"),
    pkg("@open-tomato/secret", false), // not eligible
  ];

  test("explicit per-package levels", () => {
    const { entries, errors } = resolveEntries({
      explicit: [
        { name: "@open-tomato/logger", level: "minor" },
        { name: "@open-tomato/errors", level: "patch" },
      ],
      autoDetected: [],
      packages,
    });
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { name: "@open-tomato/logger", level: "minor" },
      { name: "@open-tomato/errors", level: "patch" },
    ]);
  });

  test("defaultLevel fills packages given without one", () => {
    const { entries, errors } = resolveEntries({
      explicit: [{ name: "@open-tomato/logger" }],
      autoDetected: [],
      defaultLevel: "patch",
      packages,
    });
    expect(errors).toEqual([]);
    expect(entries).toEqual([{ name: "@open-tomato/logger", level: "patch" }]);
  });

  test("auto-detected packages used when no explicit list", () => {
    const { entries } = resolveEntries({
      explicit: [],
      autoDetected: ["@open-tomato/errors"],
      defaultLevel: "patch",
      packages,
    });
    expect(entries).toEqual([{ name: "@open-tomato/errors", level: "patch" }]);
  });

  test("errors on unknown package", () => {
    const { errors } = resolveEntries({
      explicit: [{ name: "@open-tomato/nope", level: "patch" }],
      autoDetected: [],
      packages,
    });
    expect(errors.some((e) => e.includes("unknown package"))).toBe(true);
  });

  test("errors on non-eligible package", () => {
    const { errors } = resolveEntries({
      explicit: [{ name: "@open-tomato/secret", level: "patch" }],
      autoDetected: [],
      packages,
    });
    expect(errors.some((e) => e.includes("not publish-eligible"))).toBe(true);
  });

  test("errors on missing level", () => {
    const { errors } = resolveEntries({
      explicit: [{ name: "@open-tomato/logger" }],
      autoDetected: [],
      packages,
    });
    expect(errors.some((e) => e.includes("no bump level"))).toBe(true);
  });

  test("errors on invalid level", () => {
    const { errors } = resolveEntries({
      explicit: [{ name: "@open-tomato/logger", level: "huge" }],
      autoDetected: [],
      packages,
    });
    expect(errors.some((e) => e.includes("invalid level"))).toBe(true);
  });

  test("errors when there are no targets at all", () => {
    const { errors } = resolveEntries({
      explicit: [],
      autoDetected: [],
      packages,
    });
    expect(errors.some((e) => e.includes("no target packages"))).toBe(true);
  });
});
