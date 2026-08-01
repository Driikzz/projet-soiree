# Architecture

## Principes

- API REST pour les lectures et mutations.
- Socket.IO pour notifier les clients et déclencher une resynchronisation.
- PostgreSQL comme source de vérité.
- TanStack Query comme cache serveur dans le frontend.
- Logique métier indépendante d’Express et de Spotify.
- Une seule instance API et une seule soirée active par compte Spotify pour le MVP.

## Flux de développement

Vite relaie `/api` et `/socket.io` vers Express. En production, Nginx fournit le même routage sur
une origine unique, ce qui simplifie les cookies et la protection CSRF.

## Temps réel

Socket.IO ne remplace pas l’API REST. Les créations, votes et contrôles restent des requêtes HTTP
validées et protégées par CSRF. Après validation en base, l’API publie dans la room
`party:<partyId>` une enveloppe contenant la version courante de la soirée.

Le navigateur traduit l’événement en familles de données (`party`, `playlists`, `tracks`,
`playback` ou `rewards`) et invalide les clés TanStack Query correspondantes. Une souscription et
une resynchronisation complète sont effectuées après chaque reconnexion ; une resynchronisation
périodique toutes les 60 secondes corrige les éventuels événements manqués.

L’adaptateur Socket.IO reste en mémoire pour le MVP à instance unique. Un déploiement horizontal
nécessitera un adaptateur partagé, par exemple Redis, sans changer les contrats métier.

## Orchestration de lecture

Un timer interne à l’unique processus API récupère les soirées actives puis synchronise leur player
Spotify. Un verrou mémoire par soirée empêche deux cycles concurrents. Cette solution correspond au
MVP mono-instance et évite l’ajout prématuré d’une file de jobs.

PostgreSQL conserve la file SongFest : morceau courant, morceau réservé et verrou DOUBLE_TRACK.
Spotify ne reçoit jamais la liste complète. Le prochain morceau est sélectionné dans l’ambiance
programmée, sinon dans l’ambiance active, puis envoyé seulement dans les 30 dernières secondes du
titre courant.

Les statuts suivent les observations réelles de Spotify :

```text
PENDING → SELECTED → QUEUED → PLAYING → PLAYED
```

Une commande refusée remet `SELECTED` à `PENDING`. Le cycle émet ensuite un événement Socket.IO
versionné ; l’interface recharge le snapshot et anime localement la progression.

## Dépendances entre workspaces

`web` et `api` peuvent dépendre de `shared`. Le package `shared` ne dépend jamais des applications
et ne contient ni composant React, ni accès à la base de données.
