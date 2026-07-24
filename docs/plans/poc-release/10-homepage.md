---
repo: open-tomato (new sibling app workspace, e.g. /homepage)
tier: milestone
depends-on: [06]
parallel-with: [07, 08, 11]
size: S
status: COMPLETE — /homepage built + gate green; ui-portal made responsive, republished @0.8.2 (2026-07-24)
linear: OPT-249
---

> **Done (2026-07-24).** `/homepage` (Vite + React 19) composes `@open-tomato/ui-portal`
> — Header + Landing + Footer — with outbound links wired via env-overridable config
> (`homepage/src/links.ts`). Turbo gate green; 4 smoke tests. Building it surfaced that
> the ui-portal marketing components were desktop-first; they were made responsive at the
> library layer (nav/search collapse, grids stack, hero headline + mascot scale, terminal
> scrolls) — no overflow at 320/375/768/1024/1440 — and the fixed group republished at
> **0.8.2**. Static `dist/` builds for the WS12 pilot. Gaps: OPT-257 (ThemeName re-export),
> OPT-258 (Icon dynamic-map bundle weight). Dev preview: `.claude/launch.json` → `homepage` (:5175).

# WS10 — Homepage app

**Goal:** public product landing page (single page) built from `@open-tomato/ui-portal`.

## Milestones

1. App workspace scaffold (Vite + React 19, passes turbo gate from day one).
2. Landing composition: Hero, FeatureGrid, CommunityStrip, Header, Footer from `ui-portal`; product description + intro copy.
3. Outbound links: GitHub, Patreon, Documentation/API Reference (WS11 site), Login → auth app (WS08).
4. Static build artifact + container image for WS12 (this app is the WS12 pilot candidate — prioritize a deployable skeleton over final copy).

## Cut-lines

- Copy/content can be placeholder-quality for PoC; no additional screens; no blog.

## Verification

- Build + link checker; renders at 320/768/1024/1440 without overflow; deployed reachable via WS12 pilot.
