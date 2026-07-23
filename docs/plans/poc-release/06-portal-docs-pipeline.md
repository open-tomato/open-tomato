---
repo: component-breakdown → open-tomato (packages/ui/portal, packages/ui/docs)
tier: detailed
depends-on: [05-wave-0 (port checklist + gate + theme-default), 03a (skill adaptation)]
parallel-with: [03b–d, 04]
size: M–L (2–3 sessions)
status: breakdown DONE (CB PRs #17, #18); OT port half next
linear: OPT-245
---

# WS06 — Portal & docs pipeline → `@open-tomato/ui-portal` + `@open-tomato/ui-docs`

**Goal:** the full portal/marketing + docs component surface through the same breakdown→port pipeline (D8), landing as two new published packages cloned from the `packages/ui/components` boilerplate.

**Source:** `demo/raw-design-system/ui_kits/portal/` — Landing, Hero, FeatureGrid, CommunityStrip, BlogIndex, BlogPost, DocsLayout, Header, Footer, Primitives.

## Session(s) A — Breakdown (CB repo)

Using the 03a-adapted skill (raw-DS JSX sources), migrate into `pre-components` (new `src/portal/` grouping or equivalent — decide layout at session start, keep the portal surface clearly separable for the split port):
- [x] `Header` + `Footer` (shared chrome)
- [x] `Hero`
- [x] `FeatureGrid`
- [x] `CommunityStrip`
- [x] `Landing` (composition template)
- [x] `BlogIndex` + `BlogPost`
- [x] `DocsLayout` (+ any docs-specific molecules the JSX reveals: sidebar nav, TOC, content styles)
- [x] Reuse existing atoms/molecules wherever the portal JSX duplicates them (buttons, cards, typography) — no parallel primitive set
- [x] Rosetta verification per component (portal artboards; extend `compare-design.mjs` source handling if needed)

## Session(s) B — Scaffold + port (OT repo)

- [ ] Clone `packages/ui/components` boilerplate → `packages/ui/portal` (`@open-tomato/ui-portal`) and `packages/ui/docs` (`@open-tomato/ui-docs`); both depend on `@open-tomato/theme-default` + `@open-tomato/ui-components` (for shared primitives), join the fixed version group (D2), inherit the reference-free gate (D4)
- [ ] Package split: marketing surface (Landing/Hero/FeatureGrid/CommunityStrip/Header/Footer/Blog*) → `ui-portal`; DocsLayout + docs-specific pieces → `ui-docs`; Header/Footer live in `ui-portal` and are imported by docs consumers (revisit only if it creates an awkward dependency)
- [ ] Apply THE port checklist (WS05) per component; regenerate baselines in-repo (D6)
- [ ] Changesets + `publish:local` for both packages

## Verification

- CB side: rosetta loop green (`compare-design.mjs`, `check:stories`, `test-visual.sh`).
- OT side: turbo gate + reference-free gate green; install-from-registry smoke: scratch app renders Landing + a DocsLayout page from the published packages.
