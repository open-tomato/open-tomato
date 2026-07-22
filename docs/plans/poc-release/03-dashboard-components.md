---
repo: component-breakdown
tier: detailed
depends-on: [03a first within this WS; D1 spike for 03b]
parallel-with: [01, 02, 05-wave-0, 06-breakdown]
size: L (4+ sessions: 03a–03d)
status: 03a+03b+03c done (CB PRs #8, #10, #11); 03d ready
linear: OPT-242
---

# WS03 — Dashboard component catalog completion

**Goal:** every net-new component from [reference/UI-New-Components.md](reference/UI-New-Components.md) and [reference/UI-App-Shell.md](reference/UI-App-Shell.md) exists in `@open-tomato/pre-components` at rosetta-verified quality, following the established pattern (`index.ts` + `<Name>.tsx` + `<Name>.variants.ts` + `<Name>.stories.tsx`, CVA variant-first, no inline classes).

**Sources:** raw-DS JSX under `demo/raw-design-system/dashboard/*.jsx` + `topbar.html`; specs in `reference/UI-*.md`. Where raw design and the UI-*.md specs diverge (e.g. list/cards double display), **the specs win**.

**Do not** source anything from OT `packages/ui-skeleton` (D9).

## Session 03a — Skill adaptation + primitives (M) — DONE (CB PR #8: skill covers bundle/raw-DS/spec-driven sources; compare-design.mjs gained --source topbar|dashboard; lucide-react added; repo lint debt tracked as OPT-253)

Tooling first:
- [x] Adapt `skills/component-from-design` for raw-DS JSX sources: the rosetta loop currently assumes bundle-chapter sources; unmigrated screens live in richer raw-DS JSX (e.g. `AgentEditor.jsx` 434 LOC). Document the adapted loop (source extraction → CVA mapping → fidelity check via `compare-design.mjs` — extend `--source` handling if needed for dashboard/topbar artboards).

Primitives (all from UI-New-Components.md):
- [x] `Icon` — Lucide-by-name wrapper (`<Icon name="terminal" size accent bg-color>`); also closes the CB "real Icon component" follow-up
- [x] `StatusIndicator` — circle/rounded-square, accent + `pulse={true}`
- [x] `TrendIndicator` — ratio-based trend prop, up/down/flat, optional `+x%`/`-x%` value
- [x] `Formatted*` family + single Intl-based formatter utility (no 3rd-party deps): `HumanReadableValue`, `FormattedDate`, `FormattedCurrency`, `FormattedPercentage` (ratio|raw), `FormattedDuration`, `FormattedRelativeTime` (day→hh:mm, then relative ladder), `FormattedValue` (type-dispatching)
- [x] `ModalFooterStatus` — footer status string slot supported by the modal provider/component

## Session 03b — Cards & charts (M) — DONE (CB PR #10: D1 resolved hand-rolled SVG; + SectionCard shell, chartTone palette, UsageBar; toDate date-only local-parse fix; >100% overflow treatment designed)

- [x] **D1 spike (~1h)**: LineChart hand-rolled SVG vs library; record outcome in 00-master-plan decision log
- [x] `SmallStatCard` — header (title + decoration|trend), stat value w/ unit or `current / goal`, optional bottom line (text/link/progress/sparkline)
- [x] `RowStatCard` — title/subtitle + invisible-column ministats; row 2 optional text/link/progress (fix the misaligned forecast-legend noted in spec)
- [x] `UsageChart` / `ProgressChart` — simple (3-col) + multi (decoration/name+bar/value + free columns) + single-line segmented variant; progress >100% visual treatment (not in original design — design it)
- [x] `Sparkline` — mini chart for card bottoms and table cells
- [x] `CalendarHeatmap` — week (7×24, hour labels every 4h) and 90/180-day modes, Monday start (settings-driven later), hover tooltip, optional drill-down click
- [x] `LineChart` — per D1 outcome (Overview "Tokens by model")
- [x] `FilesChanged` — header (files/additions/deletions), rows: file-type icon, path, `+n` green / `-n` red

## Session 03c — Table kit & known entities (M) — DONE (CB PR #11: CellContent kit, 10 entity cells, Table striped/selectable/reorderable/RowContextAction + cellTypes registry; decisions documented: parent-cell tooltips, controlled onSelectionChange, ConfirmPopover seam for 03d)

CellContent kit:
- [x] Value / Value-with-unit (right-aligned, unit greyed)
- [x] Decoration (avatar/icon/badge, first-column rule)
- [x] DoubleLine text (name + truncating subtitle)
- [x] Status (ok/warn/err/info/disabled; rounded/square/icon formats)
- [x] Label (accent color, array support)
- [x] Bar indicator (mini + regular stroke variants)
- [x] `tokens-consumption` + `tokens-progress` (green→yellow→red thresholds)
- [x] `spend-over-time` (FormattedCurrency over duration·relative-time)
- [x] Decide: tooltip ownership — per-content component vs parent cell (document the call)

TableRow modifiers:
- [x] Checkbox column (parent-provider events question — document the call)
- [x] SortHandle (Droppable/Draggable reorder)
- [x] odd/even styling prop
- [x] Context action (`ellipsis-vertical` menu, `{actions[], destructive}` contract, destructive → semi-generic confirm popover naming the action + entity)

Known entities (contract-typed display components):
- [x] `agent-title`, `agent-cell`, `session-inline`, `session-cell`, `model-cell`, `model-footer`, `branch-inline`, `user-inline`, `task-cell`, `tool-title`
- [x] Self-describing table integration: column type `{entity}-{variant}` → inferred component

## Session 03d — Topbar set, form additions, passkey (M)

Topbar (source: `topbar.html` + `TopbarLive.jsx`; currently only story fixtures):
- [ ] `WorkspaceSwitcher` — 5 most recent + settings link, check marks, hidden for single-workspace, fixed/max width, no hard topbar-scope dependency (may move to sidebar)
- [ ] `SearchSuggest` — ⌘K global, lens icon + `⌘K` label, 5 suggestion kinds (agent/session/task/tool/doc) each with accent, keyboard navigation, enter-fallthrough to full search page
- [ ] `NotificationsBell` — ghost icon button + popover grouped by level (ok/warn/err/info), red dot ≥1 unread, mark-all-read header action
- [ ] `ThemeSwitcher` — ghost icon button, hidden when user preference = system
- [ ] `ProfileMenu` — touchable avatar, header (avatar/name/email/role), My Profile / Account Settings / Switch workspace / Logout (inline confirm)
- [ ] `ConfirmPopover` — standalone + inline flavours; always names the action
- [ ] `AppShellTopbar` upgrade — collapse button in wrapper; sidebar: dynamic nav config (json/api-driven), week-summary widget stub, bottom quick-access (Docs/Settings); optional `AppShellContent` footer

FormKit additions:
- [ ] `VerboseOption` / `VerboseOptionList` (from raw `ModelOption` in `AgentEditor.jsx`) — radio/checkbox behavior, model badges, description
- [ ] `DecoratedToggle` / `DecoratedToggleList` (from raw `ToolPicker` in `AgentEditor.jsx`) — grouped toggles w/ x/y indicator
- [ ] `ChipList` — single/multi modes, suggestions, keyboard nav, `allowNew`
- [ ] `AvatarSelector` — big avatar + initials input + color grid

Passkey (D5):
- [ ] `PasskeyPrompt` from `dashboard/Profile.jsx` (raw DS settings.html) — post-"add passkey" 2FA-modal state awaiting browser WebAuthn interaction; wire as a TwoFactor flow step candidate (app wiring happens in WS08)

## Verification (every session)

- Rosetta loop per component: `compare-design.mjs` side-by-side (light + dark), `bun run check:stories`, `bun run test`, `test-visual.sh` baselines updated deliberately.
- Every component ships `.tsx` + `.variants.ts` + `.stories.tsx` + `index.ts` and is exported from the root barrel.
