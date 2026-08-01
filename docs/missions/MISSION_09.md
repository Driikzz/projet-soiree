# Mission 9 - Lecture automatique

## Objectif

Synchroniser le player Spotify de l’organisateur avec la file interne SongFest, sélectionner le
meilleur prochain morceau et appliquer les changements d’ambiance à la fin d’un titre.

## Fichiers principaux

- `packages/shared/src/domain/select-next-track.ts` : sélection déterministe et équitable.
- `packages/shared/src/schemas/spotify.ts` : contrat public de l’état de lecture.
- `apps/api/src/modules/playback/playback-policy.ts` : fenêtre d’envoi du prochain titre.
- `apps/api/src/modules/playback/playback.service.ts` : réconciliation et transitions atomiques.
- `apps/api/src/modules/playback/playback.orchestrator.ts` : cycle périodique.
- `apps/api/src/modules/playback/playback.routes.ts` : consultation et contrôles.
- `apps/api/src/modules/spotify/spotify-api.client.ts` : commandes Spotify authentifiées.
- `apps/web/src/components/now-playing-card.tsx` : morceau courant et progression locale.
- `apps/web/src/routes/admin-spotify-page.tsx` : lancement, pause, reprise et passage manuel.

## Critères d’acceptation

- Seules les soirées `ACTIVE` sont synchronisées automatiquement.
- Un cycle concurrent sur la même soirée est ignoré.
- Le player est relu toutes les 15 secondes par défaut.
- La sélection respecte DOUBLE_TRACK, priorité, votes, équité, artistes récents et ancienneté.
- Le prochain titre est réservé atomiquement en passant de `PENDING` à `SELECTED`.
- Un seul titre SongFest peut être `queuedTrackId`.
- Spotify ne reçoit qu’un seul prochain titre, préparé pendant la dernière minute.
- Une absence de lecture démarre directement le morceau sélectionné.
- Une erreur Spotify libère la réservation et permet une nouvelle tentative.
- Un titre réellement observé dans Spotify passe à `PLAYING`.
- Le titre précédent passe à `PLAYED` lorsque Spotify change de morceau.
- Une ambiance programmée devient active uniquement après la fin du morceau, ou immédiatement si
  aucune lecture n’est en cours.
- Une playlist épuisée programme automatiquement la prochaine playlist non vide dans l’ordre de
  création, avec retour au début de la liste après la dernière.
- La progression invitée est calculée localement à partir du timestamp serveur.
- Les contrôles administrateur exigent une session, un cookie CSRF et un appareil sélectionné.

## Tests attendus

- Première observation Spotify sans faux changement de morceau.
- Changement et fin de morceau détectés.
- File vide démarrée immédiatement.
- Envoi différé jusqu’à la dernière minute et interdiction de réserver un deuxième titre.
- Maintien de la playlist active tant qu’elle contient des morceaux en attente.
- Bascule cyclique vers la prochaine playlist non vide lorsque l’ambiance active est épuisée.
- Priorités, votes, équité et DOUBLE_TRACK via les tests métier existants.
- Contrat de lecture refusant une progression négative.
- Carte de lecture et barre de progression accessibles.
- Transitions PostgreSQL et commandes Spotify réelles dès que Docker et un compte de test sont
  disponibles.

## Commandes

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run db:validate
docker compose config
```

## Sécurité

- Les commandes Spotify restent entièrement côté serveur.
- La cible `device_id` vient uniquement de la soirée appartenant à l’administrateur.
- Les URIs envoyées proviennent des métadonnées relues précédemment depuis Spotify.
- Le cycle ne journalise ni token, ni URI, ni titre.
- Les contrôles sont limités à 30 appels par minute et par IP.
- Les commandes externes sont séquentielles, car Spotify ne garantit pas leur ordre lorsqu’elles
  sont exécutées simultanément.
- Une réservation en erreur revient à `PENDING` ; aucun compteur invité n’est modifié.

## Correspondance frontend/backend

| Parcours                   | Frontend                        | Backend                               |
| -------------------------- | ------------------------------- | ------------------------------------- |
| Lancer la soirée           | Bouton « Lancer la soirée »     | Statut `ACTIVE` puis première synchro |
| Voir le morceau courant    | Carte, pochette et contributeur | `GET /api/parties/:id/playback`       |
| Suivre la progression      | Calcul local toutes les 500 ms  | Timestamp toutes les 15 secondes      |
| Préparer le prochain titre | Aucun chargement perceptible    | `selectNextTrack` puis file Spotify   |
| Changer d’ambiance         | Message « prendra le relais »   | Activation à la transition Spotify    |
| Pause, reprise et passage  | Contrôles organisateur          | Commandes Player authentifiées        |
| Corriger une dérive        | Invalidation Socket.IO          | Réconciliation PostgreSQL/Spotify     |
