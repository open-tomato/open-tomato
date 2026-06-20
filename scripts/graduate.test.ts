import { describe, expect, test } from "bun:test";
import { graduateManifestText, removeFromChangesetIgnore } from "./graduate";

const MANIFEST = `{
  "name": "@open-tomato/logger",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
`;

describe("graduateManifestText", () => {
  test("flips private, sets version, inserts publishConfig", () => {
    const { text, changes } = graduateManifestText(MANIFEST, { setVersion: "0.1.0" });
    const parsed = JSON.parse(text);
    expect(parsed.private).toBe(false);
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.publishConfig).toEqual({ access: "public" });
    expect(changes).toContain("private:false");
    expect(changes).toContain("version:0.1.0");
    expect(changes).toContain("publishConfig.access:public");
  });

  test("only touches intended fields (name/exports preserved)", () => {
    const { text } = graduateManifestText(MANIFEST, { setVersion: "0.1.0" });
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("@open-tomato/logger");
    expect(parsed.exports).toEqual({ ".": "./src/index.ts" });
    expect(parsed.type).toBe("module");
  });

  test("does not duplicate an existing publishConfig", () => {
    const withPc = MANIFEST.replace('"private": true,', '"private": true,\n  "publishConfig": { "access": "public" },');
    const { text, changes } = graduateManifestText(withPc, { setVersion: "0.1.0" });
    expect((text.match(/"publishConfig"/g) ?? []).length).toBe(1);
    expect(changes).not.toContain("publishConfig.access:public");
  });

  test("does not change the version unless asked", () => {
    const { text, changes } = graduateManifestText(MANIFEST);
    expect(JSON.parse(text).version).toBe("0.0.0");
    expect(changes.some((c) => c.startsWith("version:"))).toBe(false);
  });

  test("leaves an already-public manifest's version replaceable to same value", () => {
    const at010 = MANIFEST.replace('"0.0.0"', '"0.1.0"');
    const { text } = graduateManifestText(at010, { setVersion: "0.1.0" });
    expect(JSON.parse(text).version).toBe("0.1.0");
  });
});

describe("removeFromChangesetIgnore", () => {
  test("removes only the named packages", () => {
    const config = JSON.stringify({
      ignore: ["@open-tomato/a", "@open-tomato/b", "@open-tomato/c"],
    });
    const { text, removed } = removeFromChangesetIgnore(config, [
      "@open-tomato/a",
      "@open-tomato/c",
    ]);
    expect(JSON.parse(text).ignore).toEqual(["@open-tomato/b"]);
    expect(removed.sort()).toEqual(["@open-tomato/a", "@open-tomato/c"]);
  });

  test("no-op when names are absent", () => {
    const config = JSON.stringify({ ignore: ["@open-tomato/b"] });
    const { removed } = removeFromChangesetIgnore(config, ["@open-tomato/x"]);
    expect(removed).toEqual([]);
  });
});
