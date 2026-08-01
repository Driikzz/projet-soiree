# Audit final SongFest

Audit réalisé le 27 juillet 2026 sur le dépôt local, après exécution des tests rapides, du parcours
PostgreSQL, des migrations, du seed, des builds applicatifs et des health checks Docker.

## 1. Résumé exécutif

SongFest est un MVP cohérent et déployable pour une soirée privée. L’architecture mono-instance est
adaptée au besoin, les frontières sensibles sont validées, les tokens Spotify restent côté serveur
et la logique de programmation musicale est indépendante du réseau. Le parcours Spotify réel reste
le principal contrôle manuel, car il dépend d’un compte Premium, d’une application Dashboard et
d’un appareil actif.

Score global : **8,7/10**.

## 2. Carte du dépôt

- `apps/web` : SPA React mobile-first, routes invitées et organisateur.
- `apps/api` : Express, Socket.IO, sessions, règles métier persistées et orchestration Spotify.
- `packages/shared` : contrats Zod, événements temps réel et fonctions métier pures.
- `prisma` : schéma, deux migrations versionnées et seed Argon2id.
- `docker` et `docker-compose.yml` : images Node/Nginx, proxy, migrations et PostgreSQL.
- `docs` : architecture, API, sécurité, Spotify, missions, déploiement et exploitation.

Les mutations passent par REST, Socket.IO notifie les clients, et PostgreSQL reste la source de
vérité.

## 3. Scores

| Domaine             | Score | Justification                                                                       |
| ------------------- | ----: | ----------------------------------------------------------------------------------- |
| Architecture        |   9,0 | Monorepo simple, modules pragmatiques, logique pure isolée                          |
| Sécurité            |   8,7 | Cookies opaques, CSRF, origine stricte, chiffrement Spotify, validation et limites  |
| Modèle de données   |   9,0 | Contraintes, index, transactions sérialisables et audit                             |
| Tests               |   8,5 | 80 tests rapides et parcours PostgreSQL réel ; pas encore d’E2E navigateur          |
| UX et accessibilité |   9,0 | Mobile-first, contrastes, clavier, états textuels, mouvement réduit                 |
| Performance         |   8,5 | Découpage des routes, cache serveur, notifications ciblées, progression locale      |
| Déploiement         |   8,5 | Images, migrations, seed, health checks, CI et guide VPS validés                    |
| Maintenabilité      |   8,8 | TypeScript strict, fonctions lisibles, peu d’abstractions et documentation complète |

## 4. Problèmes critiques

Aucun problème critique ouvert n’a été observé dans le périmètre du MVP mono-instance.

## 5. Priorité haute

### Parcours Spotify réel non automatisable dans le dépôt

Impact : une modification du Dashboard, des politiques Spotify ou de l’appareil peut casser la
lecture malgré des tests locaux verts.

Action : avant chaque soirée, exécuter la checklist de `PARTY_RUNBOOK.md`, reconnecter Spotify,
sélectionner l’appareil et lancer un test sonore.

### Avis npm à surveiller

Impact : `npm audit` remonte sept vulnérabilités hautes. L’avis React Router concerne son mode RSC,
absent de cette SPA Vite ; la chaîne ESLint est réservée au développement.

Action : vérifier les nouvelles versions à chaque livraison, mettre à jour dès qu’un correctif
compatible existe et ne pas appliquer `npm audit fix --force` sans revue.

## 6. Priorité moyenne

### Absence de test E2E navigateur

Ajouter après le MVP un scénario Playwright couvrant connexion, création, QR code, arrivée invitée
et reconnexion Socket.IO. Garder le test Spotify manuel.

### Sauvegarde non planifiée automatiquement

Le guide fournit sauvegarde et restauration, mais le VPS doit encore planifier, chiffrer et
externaliser les dumps selon la valeur de l’historique.

### Architecture volontairement mono-instance

L’orchestrateur et Socket.IO utilisent la mémoire locale. Avant plusieurs réplicas, ajouter un
verrou distribué, un adaptateur Socket.IO partagé et un traitement idempotent des commandes
Spotify.

## 7. Priorité basse

- Ajouter des métriques de durée de requête et d’échecs Spotify si le produit dépasse une soirée
  privée.
- Ajouter une purge configurable des sessions expirées et des audit logs anciens.
- Produire des images runtime encore plus petites en séparant strictement les dépendances de build.
- Initialiser Git et activer la CI dans l’hébergement du dépôt ; l’environnement local audité ne
  contient pas de métadonnées Git.

## 8. Feuille de route

### Maintenant

- Déployer sur le domaine HTTPS définitif.
- Configurer le Dashboard Spotify et les utilisateurs autorisés.
- Tester sauvegarde et restauration sur une base séparée.
- Exécuter `npm run check:release` et `npm run test:integration`.

### Ensuite

- Ajouter Playwright sur les parcours critiques.
- Automatiser les sauvegardes chiffrées et leur contrôle.
- Mettre à jour les dépendances signalées lorsqu’un correctif compatible est publié.

### Plus tard

- Ajouter la coordination distribuée uniquement si plusieurs instances deviennent nécessaires.
- Ajouter métriques et alertes uniquement si l’usage sort du cadre privé.

## 9. Posture de sécurité

Les contrôles couvrent les risques essentiels : mot de passe Argon2id, sessions opaques hachées,
cookies sécurisés, CSRF, origine et CORS exacts, payloads limités, Zod, rate limiting, contrôle de
propriété, transactions, journal d’audit et messages nettoyés. Les tokens Spotify sont chiffrés
AES-256-GCM et ne quittent pas l’API. Les ports Docker sont locaux par défaut.

Les risques résiduels assumés sont le compte organisateur unique, le déploiement mono-instance et
l’absence de rotation transparente de la clé Spotify.

## 10. Performance et évolutivité

Le bundle initial reste à environ 111 Ko gzip de JavaScript et 9 Ko gzip de CSS. Les routes lourdes
sont chargées à la demande. TanStack Query limite les requêtes redondantes, Socket.IO transporte des
notifications ciblées et la progression est interpolée côté navigateur.

Le système convient à une soirée privée. Le premier plafond n’est pas PostgreSQL mais
l’orchestrateur Spotify mono-instance et les limites externes de Spotify.

## 11. Architecture et qualité du code

Les services contiennent les règles, les routes orchestrent HTTP et les fonctions de sélection,
quota, admissibilité et seuil restent pures. Le package partagé ne contient que les contrats
réellement communs. Aucun `any` explicite, Redux, microservice ou moteur générique de récompenses
n’a été introduit.

## 12. Gains rapides réalisés

- Migration automatique avant l’API.
- Seed réellement exécutable dans l’image de production.
- Base PostgreSQL éphémère pour les tests d’intégration.
- Garde anti-effacement d’une base non dédiée.
- Ports locaux et nombre de proxies explicitement borné.
- CI Node 24 avec PostgreSQL.
- Guides de déploiement, sauvegarde et exploitation.

## 13. Fondations solides

La séparation REST/temps réel, les contraintes PostgreSQL, la sélection déterministe du prochain
morceau, les transactions sérialisables et l’interface mobile accessible constituent les points les
plus solides du projet.

## 14. Traçabilité

Les constats reposent sur :

- lecture du code, des contrats, migrations, conteneurs et documents ;
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` et `npm run build` ;
- migration d’une base `songfest_test` vide et parcours d’intégration ;
- construction des images API et web ;
- migration et seed dans les images de production ;
- health checks PostgreSQL, API, Nginx et proxy HTTP ;
- `npm audit --json`.
