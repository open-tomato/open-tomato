# AGENTS — app/

The Open-Tomato webapp (Vite + React 19 + TypeScript + react-router 7).
Workspace member; consumes `@open-tomato/ui-components` (`workspace:*`).

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow)
and the WS07 plan: [`../docs/plans/poc-release/07-webapp-frontend.md`](../docs/plans/poc-release/07-webapp-frontend.md).

## Status

WS07 session 0 (scaffold) is done: router with the spec URL patterns,
AppShell + topbar chrome wired to mock state, theme switching, and the
typed mock data layer. Pages are placeholders — real page content lands in
WS07 sessions 1–3.

## Layout

- `src/app-shell/` — AppLayout (AppShell + Outlet), Sidebar, Topbar, nav
  config as data, `useShellData` (shell chrome state from the mock api).
- `src/routes/` — route table (`routes.tsx`), path helpers, PlaceholderPage.
  Bases: `/` (single workspace) and `/workspace/:workspaceId`; feature
  paths hang off either base. The Roadmap nav entry maps to `/tasks`.
- `src/data/` — typed entity contracts (`types.ts`), deterministic fixtures
  (fixed ids/dates — never `Date.now()`), and the async mock `api` facade.
  The contracts are a deliverable: keep
  [`docs/data-contracts.md`](./docs/data-contracts.md) in sync — it is the
  draft backend API requirements artifact.
- `src/theme/` — ThemeProvider stamping `data-theme` on `<html>` per the
  tokens.css contract (`system` preference removes the attribute and hides
  the switcher).
- `src/styles/index.css` — Tailwind 4 consumer entry per the ui-components
  lib.css contract.

## Conventions when active

- This is app code, not library code: compose `@open-tomato/ui-components`;
  never copy component source in, never import from the pre-publish repos.
- Pages consume data ONLY through `src/data`'s `api` facade so real
  fetching can swap in without touching pages.
- Gate: `bunx turbo run build check-types test lint --filter=@open-tomato/app`
  must stay green. Tests are Vitest + Testing Library on jsdom (no browser
  runner here).

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../packages/ui/components/`](../packages/ui/components/) — component library
- [`../docs/plans/poc-release/reference/`](../docs/plans/poc-release/reference/) — UI specs
