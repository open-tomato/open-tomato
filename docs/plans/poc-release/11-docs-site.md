---
repo: open-tomato (new sibling app workspace, e.g. /docs-site)
tier: milestone
depends-on: [06]
parallel-with: [07, 08, 10]
size: M
status: pending
linear: OPT-250
---

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
