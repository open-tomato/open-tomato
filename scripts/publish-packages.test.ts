import { describe, expect, test } from "bun:test";
import {
  computePublishSet,
  topoSortByInternalDeps,
} from "./publish-packages";
import type { PackageInfo } from "./workspace";

function pkg(name: string, version: string, deps: Record<string, string> = {}): PackageInfo {
  return {
    name,
    dir: `/abs/${name}`,
    relDir: `shared/${name.split("/")[1]}`,
    group: "shared",
    basename: name.split("/")[1]!,
    version,
    private: false,
    eligible: true,
    manifest: { name, version, dependencies: deps },
  };
}

describe("computePublishSet", () => {
  test("includes packages never published (null) and new versions", () => {
    const eligible = [
      pkg("@open-tomato/a", "1.0.0"),
      pkg("@open-tomato/b", "0.2.0"),
      pkg("@open-tomato/c", "0.1.0"),
    ];
    const published: Record<string, string[]> = {
      "@open-tomato/b": ["0.1.0", "0.2.0"], // already at current version -> skip
      "@open-tomato/c": ["0.0.9"], // current 0.1.0 not published -> include
      // a: not present -> null -> include
    };
    const set = computePublishSet(eligible, (name) => published[name] ?? null);
    expect(set.map((p) => p.name).sort()).toEqual([
      "@open-tomato/a",
      "@open-tomato/c",
    ]);
  });

  test("empty when everything is already published", () => {
    const eligible = [pkg("@open-tomato/a", "1.0.0")];
    const set = computePublishSet(eligible, () => ["1.0.0"]);
    expect(set).toHaveLength(0);
  });
});

describe("topoSortByInternalDeps", () => {
  test("dependencies come before dependents", () => {
    const packages = [
      pkg("@open-tomato/app", "1.0.0", { "@open-tomato/core": "workspace:^" }),
      pkg("@open-tomato/core", "1.0.0", { "@open-tomato/types": "workspace:^" }),
      pkg("@open-tomato/types", "1.0.0"),
    ];
    const order = topoSortByInternalDeps(packages).map((p) => p.name);
    expect(order.indexOf("@open-tomato/types")).toBeLessThan(order.indexOf("@open-tomato/core"));
    expect(order.indexOf("@open-tomato/core")).toBeLessThan(order.indexOf("@open-tomato/app"));
  });

  test("ignores deps outside the publish set", () => {
    const packages = [
      pkg("@open-tomato/a", "1.0.0", { "@open-tomato/external": "^1.0.0", zod: "^3" }),
    ];
    const order = topoSortByInternalDeps(packages).map((p) => p.name);
    expect(order).toEqual(["@open-tomato/a"]);
  });

  test("does not drop packages when a cycle exists", () => {
    const packages = [
      pkg("@open-tomato/a", "1.0.0", { "@open-tomato/b": "workspace:^" }),
      pkg("@open-tomato/b", "1.0.0", { "@open-tomato/a": "workspace:^" }),
    ];
    const order = topoSortByInternalDeps(packages).map((p) => p.name).sort();
    expect(order).toEqual(["@open-tomato/a", "@open-tomato/b"]);
  });
});
