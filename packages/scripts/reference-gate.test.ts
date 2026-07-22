import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BANNED_PATTERNS, scan } from "./reference-gate";

function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "refgate-"));
  mkdirSync(join(root, "packages/ui/components/src"), { recursive: true });
  mkdirSync(join(root, "packages/shared/theme-default/src"), { recursive: true });
  return root;
}

describe("reference-gate", () => {
  test("clean tree passes", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "packages/ui/components/src/index.tsx"),
      "export const ok = 1;\n",
    );
    expect(scan(root)).toEqual([]);
  });

  test("banned reference is reported with file and line", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "packages/ui/components/src/Button.stories.tsx"),
      "// ported from @open-tomato/pre-components chapter 3\nexport {};\n",
    );
    const findings = scan(root);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toContain("Button.stories.tsx");
    expect(findings[0]?.line).toBe(1);
  });

  test("node_modules, dist and REFACTOR_NEEDED.md are skipped", () => {
    const root = makeRepo();
    mkdirSync(join(root, "packages/ui/components/node_modules/x"), { recursive: true });
    mkdirSync(join(root, "packages/ui/components/dist"), { recursive: true });
    writeFileSync(
      join(root, "packages/ui/components/node_modules/x/a.js"),
      "component-breakdown\n",
    );
    writeFileSync(join(root, "packages/ui/components/dist/a.css"), "raw-design\n");
    writeFileSync(
      join(root, "packages/ui/components/REFACTOR_NEEDED.md"),
      "port pending from @open-tomato/pre-components\n",
    );
    expect(scan(root)).toEqual([]);
  });

  test("gated dirs outside packages/ui are scanned (theme-default)", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "packages/shared/theme-default/src/tokens.css"),
      "/* from the raw design system */\n",
    );
    expect(scan(root)).toHaveLength(1);
  });

  test("all banned patterns match case-insensitively", () => {
    for (const pattern of BANNED_PATTERNS) {
      expect(pattern.flags).toContain("i");
    }
  });
});
