FROM oven/bun:1-alpine

WORKDIR /app

# Copy monorepo root files needed for workspace resolution
COPY package.json bun.lock bunfig.toml ./

# Copy workspace packages + this service for dependency resolution
COPY packages/ packages/
COPY services/auth/ services/auth/

# Install dependencies (prebuilt @node-rs/argon2 musl binary is fetched here)
RUN bun install --frozen-lockfile

WORKDIR /app/services/auth

EXPOSE 4500

CMD ["bun", "run", "start"]
