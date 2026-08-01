#!/usr/bin/env sh

set -eu

npm install
docker compose up -d --wait db
npm run db:generate
npm run db:migrate

printf '%s\n' "SongFest is installed."
printf '%s\n' "Optional: npm run db:seed"
printf '%s\n' "Run: npm run dev"
