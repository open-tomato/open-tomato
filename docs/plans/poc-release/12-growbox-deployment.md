---
repo: grow-box + open-tomato
tier: milestone
depends-on: [any buildable app — pilot can use a placeholder image]
parallel-with: [07, 08]
size: M
status: pending
linear: OPT-251
---

# WS12 — Deployment via grow-box

**Goal:** all four PoC apps (+ auth backend) running under grow-box via the Phase-7 `service.config.yaml` seam — the seam's first real-world use.

## Milestones

1. **Pilot early (P1)**: onboard the simplest possible service (Homepage skeleton or a placeholder static image) through the full path — commit `service.config.yaml` → `make svc-validate`/`svc-generate` → stack materialized in `apps/<id>/` → reachable behind Traefik. Purpose: burn down seam risk before the apps are done; feed fixes back to grow-box.
2. **Image pipeline**: CI builds prebuilt images for each app (grow-box only accepts prebuilt images, no git build-mode); decide registry (ghcr vs self-hosted).
3. **Onboard remaining apps** as they become buildable: docs-site, auth app, webapp, auth backend service (with postgres/redis capabilities).
4. **Ops notes**: per-app SECRETS.md, Prometheus targets, Authelia SSO decisions (public homepage/docs vs SSO-gated webapp).

## Constraints (accepted for PoC)

- Local target only; `stage` deploy env is a no-op; vault interpolation stubbed (`change-me`); deploy commands run on the remote Ubuntu host, never the Mac.

## Cut-lines

- No staging environment work; no remote targets; sandbox VM validation counts as the non-prod check.

## Verification

- grow-box sandbox e2e per app: config commit → stack materializes → HTTP 200 behind Traefik; `make ci` green; parity checks per grow-box conventions.
