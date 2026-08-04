#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=development
export STORAGE_DRIVER="${STORAGE_DRIVER:-memory}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-zo-moments-development-secret-change-me}"
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:8789}"
export APP_ORIGIN="${APP_ORIGIN:-http://localhost:${PORT:-5173}}"
export API_PORT="${API_PORT:-8789}"

bun --watch apps/api/src/index.ts &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null || true' EXIT INT TERM

bun run --cwd apps/web dev
