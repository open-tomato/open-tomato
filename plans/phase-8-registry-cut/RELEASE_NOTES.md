# Phase 8 Registry Cut — Release Notes

**Release date:** 2026-06-26
**Registry:** https://npm.heimdall.bifemecanico.com/

## Published packages

| Package | Version | Status |
|---|---|---|
| `@open-tomato/cli-core` | 0.2.0 | Published |
| `@open-tomato/platform-core` | 0.2.0 | Published |
| `@open-tomato/vault` | 0.2.0 | Published |
| `@open-tomato/config` | 0.2.0 | Published |
| `@open-tomato/platform-heroku` | — | Deferred to follow-up cut (package not yet landed) |

## Consumer pinning

Downstream consumers (e.g. the grow-box `tools-workspace` initiative) can pin this cut with:

```jsonc
{
  "dependencies": {
    "@open-tomato/cli-core": "^0.2.0",
    "@open-tomato/platform-core": "^0.2.0",
    "@open-tomato/vault": "^0.2.0",
    "@open-tomato/config": "^0.2.0"
  }
}
```

Configure the registry in `.npmrc`:

```
@open-tomato:registry=https://npm.heimdall.bifemecanico.com/
```

## Verification evidence

- `npm view @open-tomato/cli-core versions` → `[0.1.0, 0.2.0]`
- `npm view @open-tomato/platform-core versions` → includes `0.2.0`
- `npm view @open-tomato/vault versions` → includes `0.2.0`
- `npm view @open-tomato/config versions` → `[0.1.0, 0.1.1, 0.2.0]`
- `npm pack @open-tomato/cli-core --dry-run` → 0.2.0 tarball, 12.3 kB, 19 files, exit 0

## Notes

- `@open-tomato/tomato-cli` is private and is not published; consumers run it via `bunx` against the workspace.
- `@open-tomato/platform-heroku` was deferred because the implementation had not landed at cut time. It will publish in a follow-up cut once the package is in the working tree.
