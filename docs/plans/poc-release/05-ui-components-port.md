---
repo: open-tomato (packages/ui/components, packages/ui/theme-default)
tier: detailed
depends-on: [01; wave 1 on 03c+03d; wave 2 on 03b]
parallel-with: [03 (different repo), 04, 06]
size: L (3+ sessions, one per wave)
status: wave 0 ready after WS01
linear: TBD (WS02)
---

# WS05 — Port & publish `@open-tomato/ui-components` + `@open-tomato/theme-default`

**Goal:** the published, reference-free product library. Source = `@open-tomato/pre-components` (component-breakdown). Every wave ends in a changeset + Verdaccio publish so app workstreams can pin real versions (fixed version group per D2).

## THE port checklist (established in wave 0, applied to every component)

1. Copy component folder (`<Name>.tsx`, `<Name>.variants.ts`, `<Name>.stories.tsx`, `index.ts`) from CB `src/` into `packages/ui/components/src/<layer>/`.
2. Rewrite imports: `@open-tomato/pre-components` internals → local paths; tokens → `@open-tomato/theme-default`.
3. **Story-source scrub**: remove design-note comments, raw-DS links, `compare-design` annotations, CB-relative paths from stories and code.
4. Export from root barrel; add to the package Storybook.
5. One-time cross-repo fidelity check (side-by-side vs CB storybook-static or `compare-design.mjs` run) — then CB baselines stop mattering (D6).
6. Regenerate visual baselines **in this repo** (never copy them — D6).
7. Reference-free gate passes (below).

## Reference-free gate (D4) — built in wave 0

- ESLint `no-restricted-imports` (+ `no-restricted-syntax` for strings) banning `pre-components`, `component-breakdown`, `raw-design` patterns in `packages/ui/**`.
- Grep sweep script over `packages/ui/**` (src, stories, package.json, README) for the same patterns + `claude.ai/design` URLs; wired into `publish:dry` (extend `packages/scripts/preflight.ts` or a turbo lint step).

## Wave 0 — Foundation (M) — can start immediately after WS01

- [ ] `theme-default`: port `tokens.css` + Tailwind 4 preset + `global.css` `@theme` mapping from CB `src/styles/`; consider fixing the unlayered h1–h6/a/p cascade gotcha (`@layer base`) at port time since baselines are being regenerated anyway — decide and document
- [ ] Port `cn()` helper + shared lib utilities
- [ ] Port 27 atoms + 16 molecules (complete in CB today)
- [ ] Stand up package `scripts/` + Storybook so `test`, `test:visual`, `check:stories` actually run (package.json references them already)
- [ ] Reference-free gate implemented + wired into `publish:dry`
- [ ] Changeset (fixed group) + `publish:local` → install-from-registry smoke test in a scratch app

## Wave 1 — Organisms, templates, auth (M) — needs 03c/03d for the new kit

- [ ] Organisms: Table (+ WS03c CellContent kit, TableRow modifiers, known entities), Toolbar, FormKit (+ WS03d VerboseOption/DecoratedToggle/ChipList/AvatarSelector), CommandPalette
- [ ] Templates: AppShell (incl. upgraded topbar/sidebar from 03d) + AuthShell
- [ ] Topbar set: WorkspaceSwitcher, SearchSuggest, NotificationsBell, ThemeSwitcher, ProfileMenu, ConfirmPopover
- [ ] Auth screens as exported templates (D7): all 10 pages + PasskeyPrompt
- [ ] 03a primitives: Icon, StatusIndicator, TrendIndicator, Formatted* family, ModalFooterStatus
- [ ] Changeset + publish

## Wave 2 — Cards & charts (S–M) — needs 03b

- [ ] SmallStatCard, RowStatCard, UsageChart/ProgressChart, Sparkline, CalendarHeatmap, LineChart, FilesChanged
- [ ] Changeset + publish

## Verification (every wave)

- Turbo gate (`build check-types test lint`) green for the package; visual regression against freshly-seeded baselines; reference-free gate green; `publish:local` then `bun add @open-tomato/ui-components@x` from Verdaccio in a scratch project renders a sample of components.
