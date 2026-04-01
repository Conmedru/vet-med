#!/bin/sh
set -eu

require_env() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "[Entrypoint] Missing required env: $name"
    exit 1
  fi
}

warn_env() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "[Entrypoint] Warning: optional env is not set: $name"
  fi
}

kill_pid() {
  pid="$1"
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

require_env DATABASE_URL
require_env DIRECT_URL
require_env NEXT_PUBLIC_SITE_URL
require_env ADMIN_API_KEY
require_env INGEST_API_KEY
require_env CRON_SECRET

warn_env NEXT_PUBLIC_APP_URL
warn_env REPLICATE_API_TOKEN

if [ -z "${UNISENDER:-}" ] && [ -z "${UNISENDER_API_KEY:-}" ]; then
  echo "[Entrypoint] Warning: newsletter env is not set: UNISENDER or UNISENDER_API_KEY"
fi

if [ -z "${S3_ACCESS_KEY:-}" ] || [ -z "${S3_SECRET_KEY:-}" ] || [ -z "${S3_BUCKET:-}" ]; then
  echo "[Entrypoint] Warning: S3 storage env is incomplete"
fi

if [ "${RUN_PRISMA_MIGRATIONS:-false}" = "true" ]; then
  echo "[Entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "[Entrypoint] Skipping Prisma migrations"
fi

start_web() {
  echo "[Entrypoint] Starting Next.js server..."
  exec node server.js
}

start_cron() {
  echo "[Entrypoint] Starting internal cron worker..."
  exec node cron.js
}

APP_ROLE="${APP_ROLE:-web}"
SERVER_PID=""
CRON_PID=""

echo "[Entrypoint] Boot role: ${APP_ROLE}"

case "$APP_ROLE" in
  web)
    start_web
    ;;
  cron)
    start_cron
    ;;
  all)
    node cron.js &
    CRON_PID=$!

    cleanup() {
      echo "[Entrypoint] Stopping processes..."
      kill_pid "$SERVER_PID"
      kill_pid "$CRON_PID"
    }

    trap cleanup SIGTERM SIGINT

    echo "[Entrypoint] Starting Next.js server..."
    node server.js &
    SERVER_PID=$!

    set +e
    wait "$SERVER_PID"
    STATUS=$?
    set -e

    cleanup
    exit "$STATUS"
    ;;
  *)
    echo "[Entrypoint] Invalid APP_ROLE: ${APP_ROLE}. Expected web, cron, or all."
    exit 1
    ;;
esac
