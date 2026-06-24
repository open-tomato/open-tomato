---
type: prerequisites
initiative: structural-reorg
---

# Prerequisites for structural-reorg

## Blockers

| What | Owner | ETA | Status |
|---|---|---|---|
| Private registry `npm.heimdall.bifemecanico.com` reachable from executing host (TLS handshake) | dev | unblock when on tailnet/VPN | pending |

## Verified ready before starting

- [x] Backup of `/Users/marcos/projects/open-tomato/` exists (user confirmed 2026-06-24)
- [x] Source-of-truth survey complete ([MIGRATION_STATUS.md](../../../MIGRATION_STATUS.md))
- [x] `feat/config-standard` branch in `packages/` confirmed as the correct ref to subtree-merge from (3 commits ahead of main: OPT-176 + agents-config rename + workflow removal)
- [ ] R-0(b) version snapshot from a registry-reachable host — gates R-2.5 and R-6

## Notes

R-0(a) confirmed unreachable from the primary dev host on 2026-06-24: TLS `SSL_ERROR_SYSCALL` to `npm.heimdall.bifemecanico.com:443`. Same condition as recorded in MIGRATION_STATUS.md.

Tasks R-2.5, R-3c (verdaccio install verification), and R-6 cannot complete without registry access. They are explicitly deferred until the user runs them from a Grow Box-connected machine. Everything else (R-1, R-2, R-3a, R-3b, R-3c structural part, R-4, R-5) can complete without registry access — internal `@open-tomato/*` deps resolve via `workspace:^` once the consolidation lands.

R-0(c) baseline publish:dry was deliberately skipped: the only validation that matters is R-3c's post-merge dry-publish + verdaccio install. A "before" baseline adds no value when the only thing we care about is whether the merged state still produces installable tarballs.
