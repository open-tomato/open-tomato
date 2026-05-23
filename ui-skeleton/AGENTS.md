# AGENTS.md — UI Skeleton

Operational entry point for any agent (or human) working in `packages/ui-skeleton/`.
Read this file first. It points to the deep-dive skills you should load on demand.

## What this package is

A wrapper component library over [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/), styled with [Tailwind CSS v4](https://tailwindcss.com/). Each shadcn primitive (which often exposes 6–10 sub-components) is folded into a **single encapsulated wrapper** with constrained variants, so:

- The downstream agent's context surface stays small (one import per component).
- Styling stays inside the design system (variants, not arbitrary classes).
- Components can be generated, updated, or swapped atomically.

For project goals, atomic-design taxonomy, and the consumer-facing description, see [README.md](./README.md).

### Project-specific flavor of atomic design (worth knowing up front)

Most of the taxonomy in [README.md](./README.md) is standard atomic design. The cases that diverge from textbook atomic design and matter for routing decisions:

- **Particles** are not components — they're design primitives (`cn`, variants helpers, tokens, mixins, animations, shadows) that *affect* components.
- **Atoms** are single-entry wrappers. A "multi-part" shadcn primitive (Card with header/body/footer, Avatar with image/fallback, etc.) still ships as ONE atom that exposes the parts via slot props (`header`, `title`, `fallback`, `viewportProps`, ...), not as sub-component exports.
- **Atoms-that-look-like-particles** (Typography, Spinner, Kbd) have no shadcn primitive. They follow the exact same six-file atom convention; they just render a plain HTML element instead of wrapping Radix.

When in doubt about which layer something belongs in, default to the more specific (atom > molecule > organism). The placeholder barrels for molecules/organisms/providers/templates/pages exist but are empty this iteration.

## Where things live

```text
packages/ui-skeleton/
├── AGENTS.md                   # this file
├── README.md                   # consumer-facing: project goal, atomic-design taxonomy, atom inventory
├── NEXT-ITERATIONS.md          # backlog of deferred work and known follow-ups
├── skills/                     # deep-dive guidance, load on demand
│   ├── atom-authoring/         # six-file layout, naming, generation procedure
│   ├── styling/                # Tailwind v4 setup, @theme tokens, palette decisions
│   ├── cva-variants/           # CVA patterns, variant maps, polymorphism
│   ├── radix-wrappers/         # Radix primitive integration, Slot, multi-part folding
│   ├── component-testing/      # Vitest, jest-axe, jsdom polyfills, testing pitfalls
│   ├── accessibility/          # ARIA, alt, decorative markers, label patterns
│   ├── build-tooling/          # Bun, Vite library mode, ESLint, TypeScript, monorepo
│   ├── storybook/              # Storybook 8 setup, manifest, headless verification
│   └── shadcn-integration/     # registry.json, shadcn CLI, dependency translation
├── registry.json               # internal shadcn registry manifest (never published)
├── components.json             # shadcn CLI config
├── src/
│   ├── index.ts                # top-level barrel
│   ├── styles/globals.css      # Tailwind v4 entry + @theme tokens
│   ├── particles/              # shared helpers: cn, variants, tokens, mixins, shadows, animations
│   ├── atoms/                  # single-entry wrappers (one directory per atom, 6 files each)
│   ├── molecules/              # 15 molecules, one directory per molecule, 6 files each
│   ├── organisms/              # placeholder barrel
│   ├── providers/              # placeholder barrel
│   ├── templates/              # placeholder barrel
│   └── pages/                  # placeholder barrel
└── .storybook/                 # Storybook 8 config (main.ts, preview.ts)
```

## Cardinal rules (non-negotiable)

1. **Variants are the only public styling surface.** Atoms, **molecules, and organisms** MUST NOT accept `className` as a public prop. Inside an atom, molecule, or organism, `cn()` may compose classes from a base block plus variant-driven conditions, but a consumer-supplied class string is not forwarded to the rendered element. See [skills/atom-authoring/SKILL.md](./skills/atom-authoring/SKILL.md), [skills/molecule-authoring/SKILL.md](./skills/molecule-authoring/SKILL.md), and [skills/organism-authoring/SKILL.md](./skills/organism-authoring/SKILL.md). **As of phase 2, compliance is universal across atoms and molecules.** **Phase 3 audit (2026-05-23):** the no-`className` surface is extended to organisms; the same variant-only constraint applies, and the organism layer-import guard in `eslint.config.mjs` enforces direction (see cardinal rule #11).
2. **Six files per atom or molecule, no exceptions.** `<Component>.tsx`, `<component>.variants.ts`, `<Component>.test.tsx`, `<Component>.stories.tsx`, `README.md`, `index.ts`. The convention is enforced by tooling and consumer expectations.
3. **No default exports under `src/atoms/` or `src/molecules/`.** Always named exports via `React.forwardRef`. Set `displayName` after.
4. **Path alias `@/...` resolves to `src/...`.** Never use deep relative paths like `../../particles/cn`.
5. **Single quotes in `.ts` / `.tsx`.** ESLint auto-fixes; write that way to keep diffs clean.
6. **Tests are required.** Minimum three assertions per atom: renders children, applies a variant class for at least one non-default variant, no a11y violations (`await axe(...)`). Coverage threshold: 80% lines / 80% statements / 75% branches / 80% functions.
7. **Stories are required.** A `Default` story plus an `AllVariants` matrix; `tags: ["autodocs"]` enabled; `argTypes` declared for every variant prop.
8. **Every atom appears in `registry.json` `items[]`** with kebab-case `name`, `type: registry:ui`, files, and `registryDependencies` listing the npm packages it imports beyond `react` + `@/particles/cn`.
9. **The `registry.json` is internal-only.** Never publish it to npm or `ui.shadcn.com`. The `"homepage": "internal"` field signals intent.
10. **The package is standalone this iteration.** It is NOT in the root `packages/package.json` workspaces array. `devDependencies` for the shared configs use `file:../shared/<name>` links, not `workspace:^`. Do not "fix" this without coordinating a workspace rewrite.
11. **Layer-import direction is one-way.** Molecules import atoms and particles only — never other molecules, organisms, templates, pages, or providers. Atoms import particles only — never other atoms or upward layers. Enforced at lint-time by `no-restricted-imports` blocks in `eslint.config.mjs`. When a candidate composes another molecule, promote it to organism instead.

## Skill index — when to invoke which

Load a skill before making changes in its domain.

| When you're about to… | Load this skill |
|---|---|
| Add a new atom or edit an existing one's files/layout | [atom-authoring](./skills/atom-authoring/SKILL.md) |
| Add a new molecule or edit an existing one's files/layout | [molecule-authoring](./skills/molecule-authoring/SKILL.md) |
| Touch `globals.css`, add a token, choose a color, write a Tailwind class | [styling](./skills/styling/SKILL.md) |
| Write or modify a `*.variants.ts` file, design a variant axis | [cva-variants](./skills/cva-variants/SKILL.md) |
| Wrap a Radix primitive, deal with `Slot` / `Slottable` / `*Indicator` / multi-part | [radix-wrappers](./skills/radix-wrappers/SKILL.md) |
| Write a `*.test.tsx`, debug a jsdom limitation, configure Vitest | [component-testing](./skills/component-testing/SKILL.md) |
| Add `aria-*`, label something, build a loading state, deal with axe failures | [accessibility](./skills/accessibility/SKILL.md) |
| Change `vite.config.ts`, `tsconfig*`, `eslint.config.mjs`, `package.json` deps/scripts, or run `bun ...` | [build-tooling](./skills/build-tooling/SKILL.md) |
| Add a story, debug Storybook, verify the build manifest | [storybook](./skills/storybook/SKILL.md) |
| Edit `registry.json`, run `bunx shadcn@latest`, translate shadcn deps | [shadcn-integration](./skills/shadcn-integration/SKILL.md) |

## Day-to-day workflow

### Adding a new atom

1. Open `src/atoms/Button/` and read all six files. **Button is the canonical reference** for file layout, TSDoc style, variant naming, test structure, story structure, README structure.
2. Load [atom-authoring](./skills/atom-authoring/SKILL.md) and follow the per-atom procedure end-to-end.
3. Append the new atom to `registry.json` `items[]` per [shadcn-integration](./skills/shadcn-integration/SKILL.md).
4. Run `bun run check-types && bun run test && bun run lint`. All three must pass before the task is done.
5. Optional sanity check: `bun run build && bun run build-storybook`.

### Adding a new molecule

1. Open `src/molecules/Alert/` and read all six files. **Alert is the canonical reference** for molecule layout, slot-prop vocabulary, variant propagation (lookup tables from the molecule's axis to each composed atom's axis), and `data-*` test hooks.
2. Load [molecule-authoring](./skills/molecule-authoring/SKILL.md) and follow the per-molecule procedure end-to-end.
3. Import atoms via `@/atoms/<Name>` and particles via `@/particles/<name>`. **Never** import another molecule or any upward layer — the ESLint `no-restricted-imports` guard in `eslint.config.mjs` blocks it. If your candidate composes another molecule, promote it to organism instead (cardinal rule #11).
4. Do not accept `className` as a public prop, and do not pass `className` into composed atoms (atoms reject it both at the type level and at runtime). If a knob is missing, add a variant axis — to your molecule, or to the composed atom — rather than opening an escape hatch.
5. Append the new molecule to `registry.json` `items[]` per [shadcn-integration](./skills/shadcn-integration/SKILL.md). Internal `@/atoms/*` imports are NOT listed in `registryDependencies` — only npm packages the molecule pulls in beyond `react` + `@/particles/cn`.
6. Run `bun run check-types && bun run test && bun run lint`. All three must pass before the task is done.
7. Optional sanity check: `bun run build && bun run build-storybook`.

### Editing an existing atom

1. Read the six files for that atom end-to-end before changing anything.
2. If you're changing the public API (props, variants), update `<Component>.test.tsx`, `<Component>.stories.tsx`, and `README.md` in the same change. They MUST stay in lockstep.
3. Update `registry.json` only if you added/removed dependencies or split/merged files.
4. Same verification chain: types, test, lint.

### Plan tracker convention

- `PLAN.md` is the **immutable** original plan; `PLAN_TRACKER.md` is the live `[x]`-checkmark tracker (initially a copy of PLAN.md). When marking a task complete, edit `PLAN_TRACKER.md` only — never modify `PLAN.md`.
- A refactor that completes multiple PLAN sub-tasks (component + test + story + README) is often landed as one bundled refactor commit, followed by per-sub-task `chore: mark X task complete in plan tracker` commits. Check the actual source files before assuming an unchecked tracker line means the work is incomplete.

### Documentation drift — annotate, don't rewrite

When a Phase tightens a cardinal rule that contradicts narrative prose elsewhere (e.g. `README.md`'s `## Atomic Design System` section's "className should be avoided as much as possible" wording is now a hard rule; the "molecule could include other molecules" allowance is now blocked by ESLint), annotate the original prose with a dated audit note rather than rewriting it. The original framing remains useful as historical context. Pattern: a `**Phase N audit (YYYY):**` bullet referencing the corresponding `AGENTS.md` cardinal rules. Keeps the diff small and surfaces drift incrementally rather than as a single large doc rewrite.

### Common task scripts

| Script | What it does |
|---|---|
| `bun install` | Install / sync dependencies |
| `bun run check-types` | `tsc --noEmit` |
| `bun run test` | One-shot Vitest run |
| `bun run test:coverage` | Vitest with coverage report (HTML + summary) |
| `bun run test:watch` | Vitest in watch mode |
| `bun run lint` | `eslint --fix` (auto-mutating, **not** check-only — see [build-tooling](./skills/build-tooling/SKILL.md)) |
| `bun run build` | Vite library build → `dist/` |
| `bun run storybook` | Storybook dev server on `:6006` |
| `bun run build-storybook` | Static Storybook to `storybook-static/` |
| `bun run shadcn:add <item>` | `bunx shadcn@latest add` — reference only; output never lands in `src/atoms/` unchanged |

## Pitfalls that will bite you

These are the highest-frequency footguns. Each is detailed in its skill, but skim the list before starting work.

- `bun test <path>` is Bun's built-in runner, **not** Vitest. Use `bun run test` or `bunx vitest run` so jsdom + setup load. ([component-testing](./skills/component-testing/SKILL.md))
- Tailwind v4 **silently drops** utility classes referencing undeclared `@theme` tokens. No build warning. Verify every `bg-*` / `text-*` / `border-*` name has a matching `--color-*` in `globals.css`. ([styling](./skills/styling/SKILL.md))
- jsdom does not implement `ResizeObserver`. Any Radix primitive that observes size (`ScrollArea`, `Slider`, etc.) throws at render. The polyfill in `vitest.setup.ts` is required. ([component-testing](./skills/component-testing/SKILL.md))
- Multi-thumb Radix primitives put `role="slider"` on the **thumb**, not the Root. Forward `aria-label` to every thumb or axe + RTL `getByRole` queries fail. ([radix-wrappers](./skills/radix-wrappers/SKILL.md))
- `Slot` + multiple children throws at runtime when `asChild=true`. Wrap the main child in `<Slottable>` so icon siblings can coexist. ([radix-wrappers](./skills/radix-wrappers/SKILL.md))
- ESM `.config.{ts,js,mjs}` files don't get `__dirname`. Use `import.meta.dirname` (Node 20.11+, Bun-supported). ([build-tooling](./skills/build-tooling/SKILL.md))
- `<input>` / `<textarea>` / `<select>` carry a native numeric `size` attribute. Any variant interface extending `*HTMLAttributes` MUST `Omit<..., 'size'>` to allow the categorical `'sm' | 'md' | 'lg'` union. ([cva-variants](./skills/cva-variants/SKILL.md))
- **Portal-based molecules need `screen.findByRole`, not container-scoped `getByRole`.** `Popover`, `Tooltip`, `HoverCard`, `ContextMenu`, and `Select` render their content into a Radix Portal **outside** the test's bound `container`. `getByRole(...)` against the destructured `container` misses portaled content and throws. Use `screen.findByRole(...)` (the `screen.find*` family searches the entire `document.body`) and await the async result to also handle the open animation. ([component-testing](./skills/component-testing/SKILL.md))
- **`trigger` slot props are `React.ReactElement`, not `React.ReactNode`.** Radix-trigger molecules (`Popover`, `Tooltip`, `ContextMenu`, `HoverCard`, `Collapsible`) wrap the trigger internally with `<Radix*.Trigger asChild>{trigger}</Radix*.Trigger>`. `asChild` calls `React.cloneElement`, which requires a single element child — a fragment, a string, an array of nodes, or `null` will throw at runtime. Type the prop as `trigger: React.ReactElement` so the constraint surfaces at compile time. ([molecule-authoring](./skills/molecule-authoring/SKILL.md))
- **The ESLint layer guard matches the import-path string, not the resolved module.** The `no-restricted-imports` block keyed off `files: ['src/molecules/**/*.{ts,tsx}']` fires against `@/molecules/X` whether `X` exists or not — useful for adding the guard before the target layer ships. If a molecule needs to compose another molecule, promote it to organism rather than reaching for `eslint-disable`. ([molecule-authoring](./skills/molecule-authoring/SKILL.md))
- **`Tooltip` ships its own internal `RadixTooltip.Provider`.** The molecule renders `<RadixTooltip.Provider delayDuration={300}>` inside itself so consumers do NOT need to wrap their app tree. In tests, pass `delayDuration={0}` as a prop on the molecule to skip the 300ms hover delay — without it, `screen.findByRole('tooltip')` races the timer and flakes. Do NOT add a second `RadixTooltip.Provider` anywhere in the app; nested providers double the delay and confuse focus management. ([molecule-authoring](./skills/molecule-authoring/SKILL.md))

## Authority and conflicts

- **AGENTS.md** (this file): operational rules, layout, skill index.
- **README.md**: project description, atomic-design taxonomy, atom inventory, public-facing.
- **Skill files**: deep-dive on a specific domain. Load when working in that domain.
- **NEXT-ITERATIONS.md**: known deferred work, refactor TODOs, follow-ups.
- **Per-atom README.md**: ground truth for that atom's public API, variants, accessibility notes.

If two persistent docs conflict, this file wins for scope and the relevant skill wins for detail. If you find a real conflict, fix the doc — don't paper over it with workarounds in code.
