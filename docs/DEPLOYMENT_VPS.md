# Déploiement sur un VPS

Ce guide décrit un déploiement mono-instance adapté à une soirée privée. PostgreSQL, l’API et le
frontend tournent avec Docker Compose. Caddy termine HTTPS devant le port web lié uniquement à
`127.0.0.1`.

## 1. Préparer le serveur

Prévois un VPS Linux x86-64 ou arm64 avec au moins 2 vCPU, 2 Go de mémoire et 20 Go de disque.
Installe Docker Engine, le plugin Docker Compose, Git et Caddy. Configure le DNS du domaine vers
l’adresse du VPS, puis n’ouvre au pare-feu que SSH, HTTP et HTTPS.

Le MVP doit rester sur une seule instance API : l’orchestrateur de lecture et les rooms Socket.IO
utilisent la mémoire du processus.

## 2. Créer l’environnement

Dans le dossier du projet :

```sh
cp .env.example .env
openssl rand -hex 32
openssl rand -base64 32
```

Renseigne au minimum :

```dotenv
NODE_ENV=production
PUBLIC_ORIGIN=https://songfest.example.com
POSTGRES_DB=songfest
POSTGRES_USER=songfest
POSTGRES_PASSWORD=un-mot-de-passe-long-et-aleatoire
SESSION_SECRET=une-valeur-aleatoire-d-au-moins-32-caracteres
INITIAL_USER_USERNAME=organisateur
INITIAL_USER_PASSWORD=un-mot-de-passe-organisateur-unique
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://songfest.example.com/api/spotify/callback
SPOTIFY_TOKEN_ENCRYPTION_KEY=une-cle-base64-de-32-octets
TRUST_PROXY=2
DB_BIND_ADDRESS=127.0.0.1
API_BIND_ADDRESS=127.0.0.1
WEB_BIND_ADDRESS=127.0.0.1
```

`TRUST_PROXY=2` correspond exactement aux deux proxies du parcours Caddy → Nginx Docker → API.
N’augmente pas cette valeur. Laisse PostgreSQL, l’API et Nginx liés à la boucle locale.

Protège le fichier :

```sh
chmod 600 .env
```

## 3. Configurer Spotify

Crée l’application dans le Spotify Developer Dashboard et déclare exactement :

```text
https://songfest.example.com/api/spotify/callback
```

Le compte organisateur doit être autorisé dans le Dashboard lorsque l’application Spotify est
encore en mode développement. Les détails des scopes et des limites sont dans
[SPOTIFY_SETUP.md](./SPOTIFY_SETUP.md).

## 4. Construire, migrer et créer l’administrateur

```sh
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm api npm run db:seed
docker compose up -d --wait
```

Le service `migrate` applique uniquement les migrations versionnées avec `prisma migrate deploy`.
Il s’exécute aussi avant chaque démarrage de l’API et peut être rejoué sans modifier une base déjà
à jour. Le seed met à jour le hash du mot de passe de `INITIAL_USER_USERNAME` et ne crée des données de
démonstration que si `SEED_DEMO_DATA=true`.

## 5. Terminer HTTPS avec Caddy

Exemple `/etc/caddy/Caddyfile` :

```caddyfile
songfest.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
```

Recharge Caddy, puis vérifie :

```sh
curl --fail https://songfest.example.com/health
curl --fail https://songfest.example.com/api/health/ready
docker compose ps
```

Le second endpoint ne devient vert que lorsque PostgreSQL répond. Vérifie aussi la connexion
administrateur, le callback Spotify, la liste des appareils et une connexion Socket.IO depuis le
navigateur.

### Variante Tailscale Funnel

Avec Funnel, Caddy n’est pas nécessaire. Publie directement le port web configuré :

```sh
sudo tailscale funnel --https=443 off
sudo tailscale funnel --bg http://127.0.0.1:8082
sudo tailscale funnel status
```

Pour `ov-5b7e2c.tail67b4b3.ts.net`, la configuration doit contenir exactement :

```dotenv
PUBLIC_ORIGIN=https://ov-5b7e2c.tail67b4b3.ts.net
SPOTIFY_REDIRECT_URI=https://ov-5b7e2c.tail67b4b3.ts.net/api/spotify/callback
WEB_PORT=8082
TRUST_PROXY=2
```

Après un redémarrage, vérifie les valeurs réellement reçues par l’API :

```sh
sudo docker compose exec api printenv WEB_ORIGIN SPOTIFY_REDIRECT_URI TRUST_PROXY
sudo docker compose logs --tail=100 api
```

Un `Socket origin rejected` indique que `WEB_ORIGIN` ne correspond pas au domaine affiché dans le
navigateur.

## 6. Sauvegardes

Sauvegarde la base avant chaque mise à jour et au minimum après une soirée importante :

```sh
docker compose exec -T db pg_dump -U songfest -d songfest -Fc > songfest.dump
```

Copie `songfest.dump`, `.env` et la clé `SPOTIFY_TOKEN_ENCRYPTION_KEY` vers un stockage chiffré
distinct du VPS. Sans cette clé, les tokens Spotify sauvegardés sont inutilisables et il faudra
reconnecter le compte.

Restauration sur une base vide :

```sh
docker compose exec -T db pg_restore -U songfest -d songfest --clean --if-exists < songfest.dump
```

Teste la restauration hors production au moins une fois avant de compter sur la sauvegarde.

## 7. Mettre à jour

```sh
git pull --ff-only
npm ci
npm run check:release
docker compose build
docker compose run --rm migrate
docker compose up -d --wait
```

Consulte ensuite les migrations et les logs :

```sh
docker compose logs --tail=100 migrate api web
curl --fail https://songfest.example.com/api/health/ready
```

Reviens à l’image ou au commit précédent si le health check échoue. Ne restaure la base que si une
migration a effectivement rendu les données incompatibles.

## 8. Exploitation et incidents

- `docker compose ps` : état des services.
- `docker compose logs -f --tail=100 api` : erreurs API et Spotify sans secrets.
- `docker compose restart api` : redémarrage de l’API ; les clients Socket.IO se reconnectent.
- `docker compose restart web` : redémarrage du proxy et du frontend.
- `docker compose exec db pg_isready -U songfest -d songfest` : diagnostic PostgreSQL.

Ne lance pas plusieurs réplicas API sans ajouter un verrou distribué pour la lecture et un
adaptateur Socket.IO partagé.

Une seule soirée peut piloter un même compte Spotify à la fois. Si une autre soirée du même
propriétaire est active, l’interface propose de la clôturer avant de lancer la nouvelle. Une soirée
active sans lecture observée pendant deux heures est clôturée automatiquement.
