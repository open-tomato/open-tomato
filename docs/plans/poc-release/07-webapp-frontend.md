---
repo: open-tomato (/app)
tier: detailed
depends-on: [05-wave-0 (scaffold), 05-wave-1+2 (pages); 04 as spec]
parallel-with: [08, 05-wave-2, 10, 11]
size: L (scaffold + ~3 page sessions)
status: session 0 done (2026-07-23); page sessions 1-3 pending (WS04 as spec)
linear: OPT-246
---

# WS07 — Webapp frontend

**Goal:** the Open-Tomato webapp in `/app`: AppShell + Overview, Sessions, Agents, Roadmap, Tools, Settings stub, Notifications, Search Results. **Frontend-only for PoC**: a mock data layer whose typed contracts double as backend API requirements. Spec = WS04 reference pages + `reference/UI-*.md`; dashboard pages are app code, not library exports (D7).

## Session 0 — Scaffold (S) — DONE (commits c6d7b59 + e9a684f: router w/ dual-base workspace mounting, AppShell + full topbar wiring, ThemeProvider, typed mock api + app/docs/data-contracts.md; gate 7/7, browser-verified; review MEDIUMs fixed: notification href routing, load-failure catches, Session.agentInstanceId)

- [x] Replace the `<h1>` placeholder: router (URL patterns from specs — `/workspace/:workspace_id` base for multi-workspace, `/` for single; sub-routes `/sessions/*`, `/agents/*`, `/tasks/*`, `/tools/*`, `/settings/*`, plus `/notifications`, `/search`), AppShell integration, dynamic sidebar nav config (json-driven per UI-App-Shell), theme switching, `⌘K` global scope switch
- [x] **Mock data layer architecture**: typed contracts per entity (Session, Agent, Task, Tool, Notification, UsageStats…) + fixture providers; contracts collected in `app/docs/data-contracts.md` (or similar) as the backend requirements artifact
- [x] Passing placeholder tests so the workspace stays green in the turbo gate

## Session 1 — Shell chrome + Overview (M)

- [ ] Topbar wired: WorkspaceSwitcher (hidden single-workspace), SearchSuggest w/ 5 suggestion kinds + enter-fallthrough to `/search`, NotificationsBell popover → `/notifications`, ThemeSwitcher (hidden on system pref), ProfileMenu w/ inline logout confirm
- [ ] Sidebar: nav items (layout-dashboard/terminal/bot/list/cpu icons), week-summary widget stub, Docs (new tab) + Settings quick access
- [ ] Overview page per WS04 reference: stat cards, budget RowStatCard, charts rows, heatmap, top-5 sessions, time-range + export toolbar

## Session 2 — Sessions + Agents (M–L)

- [ ] Sessions list + quick-filter pills + user filter; table w/ contextual actions
- [ ] New Session modal (roadmap-task suggest from mock tasks in ready-for-dev status, effort-driven quota preselection, PoC token-quota slider: ~10 steps, $10 max via Opus 4.x reference pricing, no-limit toggle, schedule text input, PR-review/notify toggles, warning zone)
- [ ] Fork (prefill rules: title suffix, task cleared — one session per task, branch cleared) + Export (JSONL download, session-slug filename)
- [ ] View Session: timeline-first layout, collapsed result card, SessionTimeline, FilesChanged, runner metadata sidebar, token SmallStatCard, single-line UsageChart
- [ ] Agents grid + filters; New/Edit/Clone modals (AvatarSelector, seed-context Droppable, VerboseOptionList models, budget slider, ToolPicker groups); card toggle enable/disable rules

## Session 3 — Roadmap + Tools + Settings/Notifications/Search (M–L)

- [ ] Roadmap table + task form w/ relations (ChipLists, blocked-by/blocking red group)
- [ ] Tools grid + dynamic New-Tool modal (type-driven segments, load-skills gating, auth schemes) + Test Connection behavior w/ persistent error toast
- [ ] Settings: vertical sub-nav shell stub only
- [ ] Notifications page + Search results page (simplified designs per WS04 session 3)
- [ ] Data-contracts doc finalized and reviewed — handoff artifact for backend planning

## Verification

- Turbo gate green; Vitest page smoke per route; manual visual pass vs WS04 reference pages (320/768/1024/1440, light + dark); keyboard nav on SearchSuggest/CommandPalette; contracts doc covers every mock consumed by any page.
