# Mission 12 — Tests et déploiement

## Objectif

Valider SongFest contre PostgreSQL réel, rendre le premier démarrage Docker reproductible et
fournir les procédures nécessaires à un déploiement VPS et à l’exploitation d’une soirée.

## Fichiers concernés

- `docker-compose.yml`
- `docker/api.Dockerfile`
- `.env.example`
- `.github/workflows/ci.yml`
- `scripts/test-integration.sh`
- `scripts/check-release.sh`
- `apps/api/tests/integration/party-flow.integration.test.ts`
- `apps/api/vitest.integration.config.ts`
- `docs/DEPLOYMENT_VPS.md`
- `docs/PARTY_RUNBOOK.md`
- `docs/FINAL_AUDIT.md`
- `README.md`
- `PROGRESS.md`

## Critères d’acceptation

- Une base de test éphémère et dédiée exécute toutes les migrations.
- Le test d’intégration refuse de nettoyer une base ne finissant pas par `_test`.
- Le parcours connexion, création, ouverture, playlist, participation et vote passe via l’API.
- Les droits entre deux organisateurs et l’unicité du vote sont vérifiés sur PostgreSQL.
- La stack Docker construit ses deux images, migre une base vide, exécute le seed et devient saine.
- Les ports de données et d’application sont liés à `127.0.0.1` par défaut.
- La CI reproduit formatage, lint, types, tests, build, migrations et intégration.
- Un guide VPS, une procédure de soirée et un audit final sont disponibles.

## Tests attendus

- 80 tests rapides existants.
- 1 parcours d’intégration PostgreSQL couvrant plusieurs invariants et endpoints.
- Migrations Prisma sur une base vide.
- Build des images API et web.
- Health checks PostgreSQL, API, Nginx et proxy `/api`.
- Seed administrateur depuis le conteneur de production.

## Commandes

```sh
npm test
npm run test:integration
npm run check:release
docker compose build
docker compose up -d --wait
docker compose run --rm api npm run db:seed
```

## Sécurité

- La base de test utilise un volume temporaire et un nom explicitement vérifié.
- Le service de migration ne reçoit que `DATABASE_URL`.
- Les ports Docker restent sur la boucle locale sauf choix explicite.
- Le nombre de proxies de confiance est borné à `false`, `1` ou `2`.
- Aucun secret de validation Docker n’est écrit dans le dépôt.
- Les sauvegardes documentées incluent la clé de chiffrement Spotify.

## Frontend et backend

Le frontend de production est compilé par Vite puis servi par Nginx avec la CSP existante. Nginx
transmet `/api` et `/socket.io` à l’API. Le backend attend PostgreSQL et la réussite de
`prisma migrate deploy` avant de démarrer. La procédure d’exploitation vérifie ensemble
l’interface, l’API, Spotify et la reconnexion temps réel.
