#!/usr/bin/env bash
# Runs a real-database spec (default: the tenant-isolation spec) against a throwaway Postgres in Docker.
# Never touches any local Postgres on 5432 or any .env file; the container is always removed.
set -euo pipefail

# Overridable so other specs can run side by side: TEST_DB_SPEC, TEST_DB_PORT, TEST_DB_CONTAINER
NAME="${TEST_DB_CONTAINER:-aura-iso-test}"
PORT="${TEST_DB_PORT:-55433}"
SPEC="${TEST_DB_SPEC:-test/db/tenant-isolation.spec.ts}"
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

cleanup # a leftover container from an interrupted run
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=iso_test_pw -p "127.0.0.1:${PORT}:5432" postgres:16-alpine >/dev/null

echo "Waiting for Postgres in container $NAME..."
for _ in $(seq 1 60); do
  # pg_isready answers during the init-time restart; the real server accepts a query afterwards
  if docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 \
    && docker exec "$NAME" psql -U postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[ "${ready:-0}" = 1 ] || { echo "Postgres did not become ready" >&2; exit 1; }
sleep 1

export TEST_DB_ADMIN_URL="postgres://postgres:iso_test_pw@localhost:${PORT}/postgres"
export TEST_DB_REQUIRED=1

cd "$API_DIR"
pnpm exec jest ${TEST_DB_JEST_CONFIG:+--config "$TEST_DB_JEST_CONFIG"} --runTestsByPath "$SPEC" --runInBand "$@"
