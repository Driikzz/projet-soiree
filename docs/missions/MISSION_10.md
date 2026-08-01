# Mission 10 - Administration et récompenses

## Objectif

Réunir le pilotage de la soirée dans un tableau de bord protégé, permettre la modération des
participants et des propositions, puis rendre les quatre récompenses du MVP réellement
utilisables.

## Fichiers principaux

- `packages/shared/src/schemas/admin.ts` : contrat du dashboard et mise à jour des réglages.
- `packages/shared/src/schemas/rewards.ts` : attribution, utilisation et représentation publique.
- `apps/api/src/modules/admin/admin.service.ts` : agrégats, modération et clôture.
- `apps/api/src/modules/admin/admin.routes.ts` : endpoints administrateur et invité.
- `apps/api/src/modules/rewards/reward.service.ts` : attribution et consommation atomiques.
- `apps/api/src/modules/playback/playback.service.ts` : réservation du second titre
  `DOUBLE_TRACK`.
- `apps/web/src/routes/admin-dashboard-page.tsx` : cockpit organisateur.
- `apps/web/src/components/party-settings-form.tsx` : réglages validés avec React Hook Form et Zod.
- `apps/web/src/components/track-reward-panel.tsx` : priorité et double titre.
- `apps/web/src/components/playlist-reward-panel.tsx` : choix de la prochaine ambiance.

## Critères d’acceptation

- Le dashboard est inaccessible sans session administrateur et ne retourne que les soirées du
  propriétaire.
- Le morceau courant, les participants, les dernières propositions et le prochain choix calculé
  sont visibles sur un seul écran responsive.
- L’organisateur peut lancer, suspendre, reprendre ou passer la lecture.
- Il peut retirer un morceau en attente, forcer sa priorité et bloquer un participant.
- Les seuils, durées, quotas et verrous sont modifiables avec les mêmes contraintes côté client et
  serveur.
- Les quatre récompenses existent : ajout supplémentaire automatique, priorité, double titre et
  choix de la prochaine ambiance.
- Un double titre exige deux morceaux distincts du bénéficiaire et verrouille le second lorsque le
  premier commence.
- La clôture rend les invités inactifs, révoque leurs sessions et déconnecte leurs sockets.
- Chaque mutation incrémente la version de soirée et laisse une trace d’audit.

## Tests attendus

- Protection du dashboard sans session.
- Refus des mutations depuis une origine non autorisée.
- Validation stricte des réglages et des types de récompense.
- Limite de deux cibles pour `DOUBLE_TRACK`.
- Soumission accessible et typée du formulaire de réglages.
- Priorité absolue du compagnon `DOUBLE_TRACK` dans `selectNextTrack`.
- Tests d’intégration PostgreSQL de la consommation concurrente lorsque Docker est disponible.

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

- Les identifiants de soirée, participant, morceau et récompense sont validés comme UUID.
- Chaque action vérifie la propriété administrateur ou la session invitée correspondante.
- Aucune donnée Spotify sensible ne figure dans le contrat du dashboard.
- Un participant bloqué ne peut recevoir ni utiliser de récompense.
- Une récompense ne peut cibler que les morceaux `PENDING` de son propriétaire dans la playlist
  active.
- Les consommations utilisent l’isolation `Serializable` et un compteur persistant.
- Les routes de mutation exigent origine, session, CSRF et rate limiting.
- Les sessions sont révoquées en base avant toute déconnexion temps réel.

## Correspondance frontend/backend

| Parcours                      | Frontend                                | Backend                                   |
| ----------------------------- | --------------------------------------- | ----------------------------------------- |
| Piloter la lecture            | Carte et commandes du dashboard         | Routes `playback/*`                       |
| Voir le prochain choix        | Résumé « prochain choix SongFest »      | `selectNextTrack` sans appel Spotify      |
| Modérer une proposition       | Forcer ou retirer                       | Statut, priorité, audit et resync         |
| Bloquer un participant        | Action sur sa fiche                     | Révocation sessions et sockets            |
| Modifier les règles           | Formulaire React Hook Form              | Schéma Zod partagé et transaction         |
| Attribuer une récompense      | Sélecteur sur le participant            | Création contrôlée par propriétaire       |
| Jouer deux titres à la suite  | Sélection ordonnée de deux propositions | Groupe de séquence et verrou de lecture   |
| Choisir la prochaine ambiance | Carte blanche sur l’accueil invité      | `scheduledPlaylistId` transactionnel      |
| Clôturer                      | Zone de danger avec confirmation        | Statut `ENDED` et révocation des sessions |
