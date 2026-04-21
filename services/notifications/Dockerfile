FROM oven/bun:1-alpine

WORKDIR /app

# Copy monorepo root files needed for workspace resolution
COPY package.json bun.lock bunfig.toml ./

# Copy workspace package.json files for dependency resolution
COPY packages/express/package.json packages/express/
COPY packages/service-core/package.json packages/service-core/
COPY services/notifications/package.json services/notifications/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY services/notifications/ services/notifications/

WORKDIR /app/services/notifications

EXPOSE 4400

CMD ["bun", "run", "start"]
