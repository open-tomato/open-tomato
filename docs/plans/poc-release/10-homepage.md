---
repo: open-tomato (new sibling app workspace, e.g. /homepage)
tier: milestone
depends-on: [06]
parallel-with: [07, 08, 11]
size: S
status: pending
linear: TBD (WS02)
---

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
