---
repo: component-breakdown
tier: detailed
depends-on: [03b, 03c, 03d]
parallel-with: [05-wave-1, 06-port]
size: M–L (2–3 sessions)
status: session 1 done (CB PR #13, 2026-07-23); sessions 2-3 ready
linear: OPT-243
---

# WS04 — Dashboard reference pages

**Goal:** replace the thin bundle-derived page stubs (21–64 LOC) with spec-conformant reference pages, proving the WS03 catalog composes into the real screens. Per D7 these are **spec artifacts** for WS07 — they stay in component-breakdown and are never published.

**Spec precedence:** `reference/UI-*.md` over raw-DS screens (e.g. Sessions is list-only, Agents is grid-only — ignore raw list/cards toggles).

## Session 1 — Overview + Sessions — DONE (CB PR #13: both pages rewritten as full spec compositions + 4 sub-page modals + new SessionTimeline molecule; catalog gaps flagged for promotion: StatusPill, label-and-text; Slider gained disabled)

Overview ([UI-Overview.md](reference/UI-Overview.md), [Snippets.md](reference/Snippets.md)):
- [x] 4× SmallStatCard row · RowStatCard (budget/usage w/ forecast) · charts row (LineChart tokens-by-model + UsageChart tool calls) · charts row (multi UsageChart spend-by-agent + CalendarHeatmap) · Top-5-sessions full-row card (rank labels, DoubleLine, model entity, status label, tokens, cost)
- [x] Toolbar: time-range selector + export menu (PDF/JSON/YAML/CSV/Share)

Sessions ([UI-Sessions.md](reference/UI-Sessions.md)):
- [x] Stat row (Live now w/ pulse, Today, Tokens today, Cost today)
- [x] Detached toolbar: name/id/agent/branch filter, status quick-pills w/ counts, user dropdown (list-only; no grid toggle)
- [x] Table per spec config (session-cell, agent-cell, status, tokens-progress, spend-over-time, user-inline, context-menu) + contextual actions (Open/Fork/Copy ID/Export; destructive Archive)
- [x] Sub-pages: **New Session** modal (full property form incl. roadmap-task suggest, token-quota slider w/ hardcoded PoC steps, warning zone), **Fork** (prefill variant), **Export** (JSONL), **View** (timeline-first: result card, `SessionTimeline`, `FilesChanged`, runner metadata sidebar, session SmallStatCard, single-line UsageChart)

## Session 2 — Agents + Roadmap + Tools

Agents ([UI-Agents.md](reference/UI-Agents.md)):
- [ ] Filter field + `+ new agent`; filter badges (all/enabled/in use/disabled); `AgentCard` grid (header w/ running badge + context menu, description, tool badges w/ `+x more`, footer w/ model-footer, relative time, run count, on/off toggle)
- [ ] New/Edit/Clone Agent modal: AvatarSelector, name/description, Droppable seed context, VerboseOptionList model pick, token-budget slider, grouped DecoratedToggleList tools

Roadmap ([UI-Roadmap.md](reference/UI-Roadmap.md)):
- [ ] `+ new task`; toolbar (search, status + priority selects); table per spec (id, task-cell, status/blocking/priority badges, user-inline, relative-time ETA, context menu w/ status+prio actions)
- [ ] New/Edit Task form: title, description, 3 selects, ChipList tags (`allowNew`), ETA text input, Droppable attachments, relations (parent single-ChipList, subtasks multi, red blocked-by/blocking group)

Tools ([UI-Tools.md](reference/UI-Tools.md)):
- [ ] Type filter badges; `ToolCard` grid (tool-title, status badge incl. "connecting" pulse state, description, decorated summary w/ URI + counts + webhooks, footer usage)
- [ ] New/Edit/Clone Tool modal: `ToolTypeSelector` (icon+name side-by-side variant), static segment, dynamic per-type segments (MCP: URL/credentials/auto-start; Skills: source + load-skills gating; API: webhook/auth-scheme/events ChipList), `ModalFooterStatus` wired to type
- [ ] Test Connection behavior + persistent error toast

## Session 3 — Settings stub + Notifications + Search results

- [ ] Settings ([UI-Settings.md](reference/UI-Settings.md)): vertical sub-nav shell only (rounded icon + title/description double-line buttons); content areas stub — full settings is a separate future effort
- [ ] **Notifications page** (new simplified design per POC-RELEASE-PLANS): table of type-badge, double-line notification text (title|source fallback + description), source, date, action/resource link
- [ ] **Search results page** (new simplified design): double-row rows with left decorator (avatar/icon by kind), title, description; click navigates — the full-page fallthrough target of `SearchSuggest`

## Verification

- Rosetta loop vs raw-DS screens where they exist (`usage.html`, `sessions.html`, `session.html`, `agents.html`, `tasks.html`, `tools.html`, `settings.html`) with spec-divergences annotated in the story; `check:stories` + `test-visual.sh` green.
