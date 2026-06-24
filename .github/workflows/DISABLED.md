# Disabled workflows

All `.yml.disabled` files in this and nested `.github/workflows/` directories
are intentionally disabled.

**Why:** the private registry (`npm.heimdall.bifemecanico.com`) lives on the
Grow Box network and is unreachable from GitHub Actions runners. Any workflow
that runs `bun install` against this repo's lockfile will fail trying to
resolve `@open-tomato/*` packages from the unreachable registry.

**What runs instead:** all package validation, building, testing, and
publishing happens locally via the bun workspace and Changesets pipeline:

```bash
bun install
bun run build
bun run check-types
bun run test
bun run preflight
bun run publish:dry
bun run publish:local
```

See [`packages/RELEASING.md`](../../packages/RELEASING.md) and the
[`dev-planner` skill](../../skills/dev-planner/SKILL.md) "Versioning and
publishing tasks" section.

**To re-enable a workflow:** rename it back to `.yml` and ensure the runner
either (a) has access to the private registry via tailnet/VPN, or (b) the
workflow uses `bun install --no-frozen-lockfile --filter '!@open-tomato/*'`
or similar to skip private deps.

**Files disabled in this batch (structural-reorg, 2026-06-24):**

- `.github/workflows/ci.yml.disabled` — root CI; `bun install --frozen-lockfile`
- `cli/.github/workflows/ci.yml.disabled` — cli package CI; same
- `cli/.github/workflows/publish.yml.disabled` — was already inert via `if: false`; renamed for consistency
- `templates/express/.github/workflows/ci.yml.disabled` — template CI; same
- `templates/mcp/.github/workflows/ci.yml.disabled` — template CI; same

**Not disabled:** none in this repo. The grow-box repo's `ci.yml` stays
enabled — it's bash-only (yamllint/gitleaks/shellcheck/docker compose),
no `@open-tomato/*` install.
