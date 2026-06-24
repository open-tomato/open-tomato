# Multi-stage build for a service adopted from template-service-express.
#
# NOTE: this Dockerfile assumes you have already switched the
# `@open-tomato/*` dependencies in package.json away from `file:` refs
# (see README — "Adapting the template"). With `file:` refs pointing
# outside this folder, `bun install` inside the build context will fail.

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies (cached when package.json + bun.lock
# are unchanged).
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2 — type-check the source.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY tsconfig.json ./
COPY src ./src

RUN bun run check-types

# ---------------------------------------------------------------------------
# Stage 3 — runtime image with only production node_modules + src.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["bun", "run", "start"]
