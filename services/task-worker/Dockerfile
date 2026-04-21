FROM oven/bun:1-alpine

# Install git (for workspace management)
RUN apk add --no-cache git

WORKDIR /app

# Copy monorepo root files needed for workspace resolution
COPY package.json bun.lock bunfig.toml ./

# Copy ALL workspace package.json files so the lockfile resolves correctly.
# Docker layer caching still works — this layer only invalidates when a
# package.json changes, not when source code changes.
COPY packages/worker-protocol/package.json packages/worker-protocol/
COPY packages/express/package.json packages/express/
COPY packages/service-core/package.json packages/service-core/
COPY packages/errors/package.json packages/errors/
COPY packages/logger/package.json packages/logger/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/cache/package.json packages/cache/
COPY packages/event-bus/package.json packages/event-bus/
COPY packages/hat-system/package.json packages/hat-system/
COPY packages/linear/package.json packages/linear/
COPY packages/loop-safety/package.json packages/loop-safety/
COPY packages/mcp/package.json packages/mcp/
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/prompt-builder/package.json packages/prompt-builder/
COPY packages/task-store/package.json packages/task-store/
COPY packages/agent-memory/package.json packages/agent-memory/
COPY packages/diagnostics/package.json packages/diagnostics/
COPY packages/react/package.json packages/react/
COPY packages/ui-ad-hoc/package.json packages/ui-ad-hoc/
COPY packages/events-ui-agents/package.json packages/events-ui-agents/
COPY packages/notifications-plugin-executor/package.json packages/notifications-plugin-executor/
COPY packages/notifications-plugin-tech-tree/package.json packages/notifications-plugin-tech-tree/
COPY packages/notifications-plugin-anthropic/package.json packages/notifications-plugin-anthropic/
COPY services/task-worker/package.json services/task-worker/

# Install dependencies. Cannot use --frozen-lockfile because the monorepo
# lockfile references all workspaces but Docker only has a subset.
RUN bun install

# Copy source code (only what the task-worker needs at runtime)
COPY packages/ packages/
COPY services/task-worker/ services/task-worker/

WORKDIR /app/services/task-worker

EXPOSE 4310

CMD ["bun", "run", "start"]
