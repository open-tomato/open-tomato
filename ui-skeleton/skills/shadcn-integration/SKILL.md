---
name: shadcn-integration
description: Use when editing registry.json, running bunx shadcn@latest commands, consulting shadcn for an atom's underlying shape, or translating shadcn's evolving dependency manifest (radix-ui umbrella vs per-primitive packages). Covers the internal-only registry convention and the lowercase-flat output trap.
---

# shadcn Integration

This skill covers everything related to [shadcn/ui](https://ui.shadcn.com/) in this package: the internal-only registry, how to consult the shadcn CLI for primitive shapes, and the dependency-translation step you have to do when copying from a shadcn `add` output.

For the six-file wrapper convention shadcn output gets rewritten into, see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).

## The registry — internal-only, never published

The `registry.json` at the package root is an **internal** shadcn registry manifest. It is committed to source control so the shadcn CLI (`bunx shadcn@latest`) and downstream tooling within this monorepo can resolve item paths, file types, and dependency metadata for every atom in `src/atoms/`.

It is **NOT published** to npm, to a public registry endpoint, or to `ui.shadcn.com`. The `"homepage": "internal"` field signals this intent. Consumers outside this monorepo should not rely on the registry; it has no stable URL and no compatibility guarantees across iterations.

If external consumption is ever needed, the registry would be published to a separate private location as a follow-up. Out of scope for the current iteration.

## Registry item shape

Every atom must appear in `registry.json` `items[]`:

```json
{
  "name": "button",
  "type": "registry:ui",
  "files": [
    { "path": "src/atoms/Button/Button.tsx", "type": "registry:ui" },
    { "path": "src/atoms/Button/button.variants.ts", "type": "registry:ui" }
  ],
  "registryDependencies": ["@radix-ui/react-slot"]
}
```

### Field conventions

- **`name`** — kebab-case (e.g. `aspect-ratio`, `scroll-area`). Matches shadcn's published-item naming, NOT the PascalCase atom directory name.
- **`type`** — always `registry:ui` for atoms in this package.
- **`files[].path`** — repo-relative paths (e.g. `src/atoms/Button/Button.tsx`). The variants file uses the lowercase / kebab-case filename (`aspect-ratio.variants.ts`, not `AspectRatio.variants.ts`).
- **`files[].type`** — also `registry:ui` for each file.
- **`registryDependencies`** — array of **NPM package names** the wrapper imports beyond `react` and `@/particles/cn`. Examples: `@radix-ui/react-slot`, `@radix-ui/react-checkbox`, `lucide-react`. Empty array for pure-CVA atoms with no external imports.

Note that this package's convention uses **per-package npm names** (`@radix-ui/react-slot`), NOT shadcn's evolving umbrella convention (see below).

## Sanity-checking after edits

Quick JSON-validity + count check after editing `registry.json`:

```bash
bun -e "const r = await Bun.file('registry.json').json(); console.log(r.items.length)"
```

For deeper validation (schema conformance), use `bunx shadcn@latest init --yes` — even when `components.json` already exists, the CLI parses `registry.json` against the schema. The flag does NOT suppress the overwrite prompt for `components.json` (see the CLI trap below), so pipe `N` via stdin:

```bash
echo N | bunx shadcn@latest init --yes
# Exits 1 with "To start over, remove the components.json file."
# That exit code is "user declined", not a validation failure.
# Reaching the prompt confirms registry.json parsed cleanly against the schema.
```

## shadcn CLI usage — reference only

`bunx shadcn@latest add <item>` can be consulted for the underlying Radix primitive shape, but its output **never lands in `src/atoms/` directly**. Always rewrite into the six-file wrapper convention.

### The lowercase-flat trap

shadcn's `add` command emits files with a LOWERCASE, FLAT naming convention directly under the `components` / `ui` alias root. Given `@/atoms` aliased and `add button`, the output is:

```text
src/atoms/button.tsx              # lowercase, flat
```

This does NOT match this package's PascalCase nested six-file wrapper convention:

```text
src/atoms/Button/
├── Button.tsx           # PascalCase, nested
├── button.variants.ts
├── Button.test.tsx
├── Button.stories.tsx
├── README.md
└── index.ts
```

The rewrite step is non-negotiable for all shadcn-wrapping atoms.

### Dry-run mode

shadcn supports a real `--dry-run` flag (CLI v3.4+) that prints the resolved file targets and dependency list without writing anything. Use it to verify alias resolution and avoid an interactive overwrite prompt:

```bash
bunx shadcn@latest add button --dry-run --yes
```

Output is a tree-formatted summary including:

- The resolved path (e.g. `+ src/atoms/button.tsx  create`).
- The dependency list.
- A "Run without --dry-run to apply." footer.

No filesystem writes, no lockfile edits beyond the initial CLI bootstrap (which `bunx` performs to fetch the shadcn binary itself).

Pair with `--diff` (per-file changes) or `--view` (file contents) when deeper inspection is needed.

### Components.json overwrite guard

`bunx shadcn@latest init --yes` still prompts interactively when a `components.json` already exists. The `--yes` flag does NOT suppress the overwrite guard. Pipe `N` via stdin to decline; the CLI exits 1 with `To start over, remove the components.json file` — that exit code is "user declined", not a validation failure.

The fact the CLI reached the overwrite prompt is itself confirmation that `components.json` parsed cleanly against the shadcn schema; a malformed config errors out earlier with a parse / schema message.

## Dependency translation — `radix-ui` umbrella vs per-primitive packages

shadcn registry items have evolved their dependency manifest. As of late 2026, the canonical `button` item declares its Radix dependency as the **umbrella `radix-ui` package** (a single meta-package re-exporting every primitive) rather than the per-primitive `@radix-ui/react-<name>` packages this iteration installed individually.

This package's convention pins each primitive separately and lists them in the local `registry.json` `registryDependencies` array as per-package strings (e.g. `@radix-ui/react-slot`).

**When consulting shadcn's `add` output for dependency hints, translate `radix-ui` back to the specific `@radix-ui/react-<name>` packages the wrapper actually imports.** Don't blindly install the umbrella.

| shadcn output | Use here |
|---|---|
| `radix-ui` | The specific `@radix-ui/react-<name>` packages your wrapper actually imports |
| `@radix-ui/react-slot` | Same (already per-primitive) |
| `lucide-react` | Same |

## Per-atom procedure (where shadcn fits)

When authoring a new atom that has a shadcn equivalent:

1. Optional but useful: `bunx shadcn@latest add <item> --dry-run --yes` to see the resolved primitive shape and dependency list.
2. Open `src/atoms/Button/` and read all six files end-to-end. Button is the canonical reference for the wrapper convention.
3. Implement the new atom following [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md) — the shadcn output informs the **internal shape** (which Radix primitive, which sub-components, which default styles to translate to variants) but is never copied verbatim.
4. Translate dependencies per the table above.
5. Append the atom to `registry.json` `items[]` with the conventions documented above.
6. Verify with the JSON-validity check (and optionally the `init --yes` schema parse trick).

For Kbd, Spinner, and Typography — atoms with **no** shadcn equivalent — skip the CLI consultation entirely. They follow the same six-file convention with pure CVA + a plain HTML tag (or polymorphic `as` prop) instead of a Radix import.
