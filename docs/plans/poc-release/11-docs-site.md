---
repo: open-tomato (new sibling app workspace, e.g. /docs-site)
tier: milestone
depends-on: [06]
parallel-with: [07, 08, 10]
size: M
status: COMPLETE — /docs-site built (hybrid aggregate+curate); ui-docs/ui-portal responsive @0.8.3 (2026-07-24)
linear: OPT-250
---

> **Done (2026-07-24).** `/docs-site` (Vite + React 19 + react-router) renders
> `@open-tomato/ui-docs` (DocsLayout/Prose/CodeBlock/TOC) with `ui-portal`
> Header/Footer chrome. **Generation pipeline** (`scripts/generate.mjs`,
> idempotent — two runs byte-identical): aggregates a curated allowlist of repo
> sources (README→Concepts/Introduction, CONTRIBUTING, `services/notifications`
> + `agents-config` READMEs→API Reference) into a normalized `content/` tree,
> plus hand-authored install/config + example pages. The build-time content
> layer (`src/content.ts`) parses frontmatter, derives the category sidebar nav
> and per-page TOC; markdown renders through `react-markdown` mapped onto the
> ui-docs component set (code→CodeBlock, tables wrapped to scroll, headings
> anchored to the TOC). Verified: turbo gate green, `check-links` (internal doc
> links resolve), regen idempotency, no overflow at 320/375/768/1024/1440.
> ui-docs/ui-portal made responsive and republished at **0.8.3**. Dev preview:
> `.claude/launch.json` → `docs-site` (:5176). Deferred (cut-lines held): in-docs
> search, API reference is Notifications+Agents to start, no versioned docs.

# WS11 — Documentation site

**Goal:** aggregated, auto-generated documentation site rendered with `@open-tomato/ui-docs` (DocsLayout et al.).

## Milestones

1. **Generation pipeline decision**: how repo sources (readmes, `docs/`, context files) compile into site content — static generation approach chosen at session start (this is the bulk of the work; the UI is mostly `ui-docs` composition).
2. **Three categories** (per POC-RELEASE-PLANS):
   - *Concepts*: intro, install, setup/config, basic usage, integrations.
   - *API Reference*: front-facing non-contract services only (e.g. Notifications, Agents).
   - *Examples*: medium→advanced usage examples.
3. **Regeneration script**: idempotent, runnable in CI.
4. Deployable static artifact + image for WS12.

## Cut-lines

- Search within docs deferred; API reference may start with one service; versioned docs out of scope.

## Verification

- Build + link checker; regeneration idempotency (two consecutive runs produce identical output); category nav renders per DocsLayout.
