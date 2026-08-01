#!/usr/bin/env sh

set -eu

npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
DATABASE_URL="${DATABASE_URL:-postgresql://songfest:songfest@127.0.0.1:5432/songfest}" npm run db:validate
docker compose config --quiet

printf '%s\n' "SongFest release checks passed."
