#!/usr/bin/env bash
# start-workers.sh — start N Docker containers and register them as workers.
#
# Usage: ./scripts/start-workers.sh [NUM_WORKERS] [EXECUTOR_URL]
#
# Defaults:
#   NUM_WORKERS=1
#   EXECUTOR_URL=http://localhost:4300
#
# Prerequisites:
#   - Docker daemon running
#   - ANTHROPIC_API_KEY set in environment
#   - Executor service running at EXECUTOR_URL

set -euo pipefail

NUM_WORKERS="${1:-1}"
EXECUTOR_URL="${2:-http://localhost:4300}"
IMAGE="${WORKER_IMAGE:-ghcr.io/anthropics/claude-code:latest}"

echo "Starting ${NUM_WORKERS} worker container(s) using image ${IMAGE}..."

for i in $(seq 1 "$NUM_WORKERS"); do
  WORKER_ID="docker-$(printf '%02d' "$i")"
  CONTAINER_NAME="executor-worker-${WORKER_ID}"

  # Create a temp directory for the workspace bind mount
  TMPDIR="$(mktemp -d)"

  echo "  [${WORKER_ID}] Starting container ${CONTAINER_NAME}..."
  CONTAINER_ID=$(docker run -d \
    --name "${CONTAINER_NAME}" \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
    -v "${TMPDIR}:/workspace" \
    "${IMAGE}" \
    sleep infinity)

  echo "  [${WORKER_ID}] Container ID: ${CONTAINER_ID}"

  # Register the worker with the executor
  echo "  [${WORKER_ID}] Registering with executor at ${EXECUTOR_URL}..."
  curl -s -X PUT "${EXECUTOR_URL}/workers/${WORKER_ID}" \
    -H 'Content-Type: application/json' \
    -d "{\"type\":\"docker\",\"address\":\"${CONTAINER_ID}\"}" | cat
  echo ""
done

echo "Done. ${NUM_WORKERS} worker(s) registered."
