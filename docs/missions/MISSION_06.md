# Mission 6 - Ajout des morceaux

## Objectif

Permettre à un participant de proposer un morceau Spotify dans une playlist en appliquant les
quotas, les règles de durée, le contenu explicite, les doublons et l’historique récent.

## Fichiers principaux

- `packages/shared/src/schemas/tracks.ts` : commandes et réponses de morceaux.
- `packages/shared/src/domain/track-eligibility.ts` : règles pures d’admissibilité.
- `packages/shared/src/domain/quota.ts` : calcul du quota restant.
- `apps/api/src/modules/tracks/track.service.ts` : autorisation et transaction d’ajout.
- `apps/api/src/modules/tracks/track.routes.ts` : liste et ajout pour les participants.
- `apps/api/src/modules/spotify/spotify.service.ts` : relecture du morceau dans le catalogue.
- `apps/web/src/lib/api/tracks.ts` : client REST typé.
- `apps/web/src/components/spotify-search.tsx` : action d’ajout et retours immédiats.
- `apps/web/src/routes/playlist-detail-page.tsx` : quota et liste des propositions.

## Critères d’acceptation

- Un participant actif ne peut agir que sur une playlist de sa soirée.
- La soirée doit être ouverte ou active et la playlist doit accepter les ajouts.
- Le frontend envoie uniquement l’identifiant Spotify choisi.
- L’API relit les métadonnées depuis Spotify avant de les enregistrer.
- Un morceau ne peut apparaître qu’une fois dans une playlist, même après suppression.
- Un morceau interdit dans la soirée reste bloqué dans toutes ses playlists.
- Un morceau récemment joué est refusé pendant la fenêtre configurée.
- La durée maximale vaut huit minutes par défaut.
- Le contenu explicite est refusé selon le réglage de la playlist.
- Le quota est indépendant pour chaque participant et chaque playlist.
- Une récompense `EXTRA_TRACK` disponible est consommée uniquement lorsque le quota de base est
  plein.
- Deux ajouts simultanés ne peuvent pas contourner le quota.
- La liste affiche les contributeurs, votes, statuts et liens d’attribution Spotify.

## Tests attendus

- Quota standard, bonus et borne à zéro.
- Doublon, morceau interdit, durée, contenu explicite et historique récent.
- Fin exacte de la fenêtre de blocage.
- Validation des commandes et réponses de morceaux.
- Parcours frontend recherche puis ajout avec un payload limité à l’identifiant Spotify.
- Tests d’intégration PostgreSQL du quota concurrent dès que Docker est disponible.

## Commandes

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## Sécurité

- Session participante, origine de confiance et jeton CSRF obligatoires sur l’ajout.
- Limite de 15 ajouts par minute et par IP.
- Identifiants de route et corps validés par Zod.
- Métadonnées reçues du navigateur ignorées.
- Réponse Spotify validée avant la transaction.
- Transaction PostgreSQL `Serializable` avec nouvelle tentative contrôlée.
- Contrainte unique PostgreSQL conservée comme dernier rempart contre les doublons.
- Audit sans titre, artiste ni données de compte Spotify.

## Correspondance frontend/backend

| Parcours         | Frontend                             | Backend                                  |
| ---------------- | ------------------------------------ | ---------------------------------------- |
| Liste des titres | Détail d’une playlist                | `GET /api/playlists/:id/tracks`          |
| Recherche        | Champ temporisé et résultats Spotify | `GET /api/spotify/search`                |
| Ajout            | Bouton par résultat                  | `POST /api/playlists/:id/tracks`         |
| Quota            | Bannière et désactivation immédiate  | Transaction et récompense `EXTRA_TRACK`  |
| Règles musicales | Messages métier français             | Fonction pure `findTrackRejectionReason` |
| Rafraîchissement | Invalidation ciblée TanStack Query   | Réponse avec morceau et quota actualisé  |
