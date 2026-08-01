#!/usr/bin/env sh

set -eu

integration_database_url="${TEST_DATABASE_URL:-postgresql://songfest_test:songfest-test-password@127.0.0.1:${POSTGRES_TEST_PORT:-5433}/songfest_test}"

stop_test_database() {
  docker compose --profile test stop db-test >/dev/null
}

trap stop_test_database EXIT INT TERM

docker compose --profile test up -d --wait db-test
DATABASE_URL="$integration_database_url" npm run db:generate
DATABASE_URL="$integration_database_url" ./node_modules/.bin/prisma migrate deploy
DATABASE_URL="$integration_database_url" npm run test:integration --workspace @songfest/api
