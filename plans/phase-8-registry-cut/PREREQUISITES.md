# Prerequisites

## Services

- [ ] `npm.heimdall.bifemecanico.com` private registry reachable from the publish machine. Verify with `curl -fsS https://npm.heimdall.bifemecanico.com/-/ping`. If unreachable, check VPN routing and DNS resolution (the structural-reorg initiative documented that VPN can interfere with registry DNS — disconnect VPN if needed).

## Credentials

- [ ] Registry publish credentials configured in `~/.npmrc` for `npm.heimdall.bifemecanico.com` with publish permission on the `@open-tomato` scope. Verify with `npm whoami --registry https://npm.heimdall.bifemecanico.com/`. Credentials are managed per `packages/RELEASING.md`.

## Repository state

- [ ] All five upstream initiatives merged into the working tree: `cli-core`, `platform-core`, `vault`, `config-schema-v2`, and (optionally) `platform-heroku`. Confirm by listing the new package directories under `packages/shared/` and the schema-v2 additions in `packages/shared/config/src/`.
- [ ] Working tree is clean (`git status` shows no uncommitted changes) so the changeset-version commits land cleanly.
