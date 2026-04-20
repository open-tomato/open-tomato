# @open-tomato/packages

Shared workspace packages published under the `@open-tomato/*` npm scope. Organized into three groups:

```
./
├── package.json              # bun workspace root (shared/*, service/*, notifications/*)
├── turbo.json                # build / lint / test / check-types pipelines
├── tsconfig.json             # extends ./shared/typescript-config/base.json
├── eslint.config.ts          # re-exports ./shared/eslint-config/base.mjs
├── shared/
│   ├── eslint-config/        # @open-tomato/eslint-config
│   ├── typescript-config/    # @open-tomato/typescript-config
│   ├── logger/
│   ├── errors/
│   ├── config/
│   ├── cache/
│   ├── diagnostics/
│   ├── types/
│   ├── event-bus/
│   ├── task-store/
│   ├── agent-memory/
│   ├── loop-safety/
│   ├── prompt-builder/
│   └── linear/               # Linear API client
├── service/
│   ├── service-core/
│   ├── express/
│   ├── mcp/
│   ├── worker-protocol/
│   └── orchestration/
└── notifications/
    ├── plugin-anthropic/     # npm: @open-tomato/notifications-plugin-anthropic
    ├── plugin-executor/      # npm: @open-tomato/notifications-plugin-executor
    └── plugin-tech-tree/     # npm: @open-tomato/notifications-plugin-tech-tree
```

The npm package names are unchanged — only the on-disk folder inside `notifications/` drops the `notifications-` prefix (the folder name already provides context).

## Commands

```
bun install
bun run build         # turbo build
bun run test          # turbo test
bun run lint          # turbo lint
bun run check-types   # turbo check-types
```

## Publishing

Publishing is gated behind a disabled GitHub Actions workflow at [.github/workflows/packages-publish.yml](./.github/workflows/packages-publish.yml). See the workflow header for enablement steps.

## Refactor context

These packages were migrated from `legacy-monorepo/packages/*` as part of [Plan 01](../open-tomato/plans/refactor/01-packages.md) in the broader umbrella refactor. Frontend-only packages (`react`, `events-ui-agents`, `ui-ad-hoc`, `hat-system`) remain in `legacy-monorepo/` until Plan 09 deletes that tree.
