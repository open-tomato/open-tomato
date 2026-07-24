---
repo: grow-box + open-tomato
tier: milestone
depends-on: [any buildable app — pilot can use a placeholder image]
parallel-with: [07, 08]
size: M
status: pending — host access confirmed; homepage/docs-site/auth all buildable now
linear: OPT-251
---

# WS12 — Deployment via grow-box

## Session context (confirmed 2026-07-24)

- **Host:** the grow-box box runs at **192.168.10.10**; SSH via the `loki` or
  `dev` shell aliases (`ssh loki` / `ssh dev`). Deploy/`make` ops run **on the
  host**, never the Mac. The grow-box repo is at `/Users/marcos/projects/open-tomato/grow-box`.
- **Pilot = homepage** (`type: frontend`, no backing stores — simplest path to
  burn down the untested Phase-7 seam). It builds to a static Vite `dist/`.
- **Prebuilt-image-only:** each app needs a **built container image pushed to a
  registry the host can pull** (git build-mode is deferred in grow-box). So WS12
  adds a Dockerfile per frontend (nginx serving `dist/`) + a CI build/push step;
  decide registry (ghcr vs the self-hosted Verdaccio-adjacent registry). The
  auth **service** already has a Dockerfile (`services/auth/Dockerfile`) and
  declares postgres + redis capabilities.
- **Config format gotcha:** the sample `samples/knowledge-base/service.config.yaml`
  puts materialization fields under `infrastructure.growbox`, but the phase-7 doc
  text says `infrastructure.homelab`. **Reconcile against the live validator on
  the host** (`make svc-validate`) before authoring the real configs.
- **Env wiring:** the frontends read outbound URLs from `VITE_*` build args
  (`homepage/src/links.ts`, `docs-site/src/links.ts`); the auth app reads
  `VITE_AUTH_API_URL`. Point these at the deployed origins per environment.
  The auth service needs `AUTH_JWT_SECRET` (≥32 bytes; it fails closed without one).

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
