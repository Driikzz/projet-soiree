# ROTATE

ROTATE est une application web collaborative de gestion musicale pour les soirées privées.
Les invités proposent et votent depuis leur navigateur. L’organisateur diffuse depuis son propre
compte Spotify et conserve le contrôle final.

## État

Les Missions 1 à 12 fournissent le monorepo, le modèle de données, l’authentification organisateur,
la participation par QR code, Spotify, l’ajout sécurisé de morceaux, les votes collectifs et la
synchronisation Socket.IO, la lecture automatique, le tableau de bord de modération et les quatre
récompenses du MVP, avec une interface responsive, des tests PostgreSQL et un déploiement Docker
documenté.

Consultez [PROGRESS.md](./PROGRESS.md) pour l’avancement détaillé.

## Prérequis

- Node.js 24 LTS recommandé
- npm 10 ou plus récent
- Docker avec Docker Compose

La version Node 23 n’est pas supportée par certaines dépendances de développement récentes.

## Installation

```sh
cp .env.example .env
npm install
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Ou utilisez :

```sh
./scripts/bootstrap.sh
```

Le frontend est disponible sur `http://127.0.0.1:5173` et l’API sur
`http://127.0.0.1:3000/api/health`. Utilisez bien l’adresse IP `127.0.0.1` pour que le callback
Spotify local et les cookies partagent le même hôte.

Créez ensuite votre compte depuis `/register`. Le seed peut facultativement créer un premier compte
avec `INITIAL_USER_USERNAME` et `INITIAL_USER_PASSWORD` depuis `.env`.

La configuration Spotify est facultative pour démarrer le projet. Pour activer OAuth, la recherche,
les appareils et le test de lecture, suis [le guide Spotify](./docs/SPOTIFY_SETUP.md).

## Commandes

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run format:check
npm run check:release
npm run db:validate
npm run db:migrate
npm run db:seed
```

## Docker

```sh
docker compose up --build
docker compose run --rm api npm run db:seed
```

L’application complète est alors exposée sur `http://127.0.0.1:8080`.

Les valeurs par défaut de Docker Compose sont réservées au développement. Changez tous les mots de
passe et secrets avant un déploiement. Le service `migrate` applique automatiquement les migrations
avant de démarrer l’API.

## Workspaces

- `@songfest/web` : React, Vite et interface utilisateur
- `@songfest/api` : Express, Socket.IO et API
- `@songfest/shared` : contrats et schémas réellement partagés

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Modèle de données](./docs/DATA_MODEL.md)
- [API](./docs/API.md)
- [Sécurité](./docs/SECURITY.md)
- [Configuration Spotify](./docs/SPOTIFY_SETUP.md)
- [Mini-charte visuelle](./docs/VISUAL_IDENTITY.md)
- [Déploiement sur un VPS](./docs/DEPLOYMENT_VPS.md)
- [Procédure de soirée](./docs/PARTY_RUNBOOK.md)
- [Audit final](./docs/FINAL_AUDIT.md)
- [Mission 3](./docs/missions/MISSION_03.md)
- [Mission 4](./docs/missions/MISSION_04.md)
- [Mission 5](./docs/missions/MISSION_05.md)
- [Mission 6](./docs/missions/MISSION_06.md)
- [Mission 7](./docs/missions/MISSION_07.md)
- [Mission 8](./docs/missions/MISSION_08.md)
- [Mission 9](./docs/missions/MISSION_09.md)
- [Mission 10](./docs/missions/MISSION_10.md)
- [Mission 11](./docs/missions/MISSION_11.md)
- [Mission 12](./docs/missions/MISSION_12.md)
