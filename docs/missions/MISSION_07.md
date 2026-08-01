# Mission 7 - Votes

## Objectif

Permettre aux participants de voter pour les morceaux de la playlist active et de choisir une
prochaine ambiance sans jamais créer plusieurs votes identiques ou plusieurs choix d’ambiance par
participant.

## Fichiers principaux

- `packages/shared/src/domain/playlist-change.ts` : seuil et verrouillage temporel.
- `packages/shared/src/schemas/tracks.ts` : état du vote de morceau.
- `packages/shared/src/schemas/playlists.ts` : état et résultat du vote d’ambiance.
- `apps/api/src/modules/votes/track-vote.service.ts` : ajout et retrait d’un vote de morceau.
- `apps/api/src/modules/votes/playlist-vote.service.ts` : déplacement du vote et programmation.
- `apps/api/src/modules/votes/vote.routes.ts` : endpoints invités protégés.
- `apps/api/src/lib/serializable-transaction.ts` : nouvelles tentatives sur conflits concurrents.
- `apps/web/src/components/playlist-card.tsx` : action de vote d’ambiance.
- `apps/web/src/routes/guest-party-page.tsx` : seuil, verrouillage et programmation.
- `apps/web/src/routes/playlist-detail-page.tsx` : vote et retrait sur les morceaux.

## Critères d’acceptation

- Un participant ne peut voter qu’une fois pour un morceau.
- Le même endpoint d’ajout est idempotent.
- Un vote de morceau peut être retiré.
- Seuls les morceaux `PENDING` de la playlist active acceptent les votes.
- Le réglage `trackVotesEnabled` est vérifié côté serveur.
- Le compteur dénormalisé est recalculé depuis les votes après chaque mutation.
- Un participant ne possède qu’un vote d’ambiance actif.
- Choisir une autre ambiance déplace ce vote au lieu d’en créer un second.
- Le seuil est le maximum entre la valeur absolue et le pourcentage arrondi au-dessus.
- Les votes peuvent s’accumuler pendant le verrouillage temporel.
- Une ambiance est programmée lorsque seuil et verrouillage sont satisfaits.
- La playlist programmée prend effet plus tard, sans interrompre le morceau courant.
- Les votes sont refusés lorsqu’ils sont désactivés, verrouillés par l’administrateur ou qu’une
  ambiance est déjà programmée.
- L’interface communique les votes, le temps restant et la prochaine ambiance avec du texte.

## Tests attendus

- Minimum absolu et pourcentage.
- Arrondi supérieur du pourcentage.
- Verrouillage temporel.
- Désactivation et verrouillage administrateur.
- Contrats du vote de morceau et de l’état de changement.
- Action de vote d’ambiance séparée du lien de navigation.
- Intégration PostgreSQL des contraintes uniques dès que Docker est disponible.

## Commandes

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run db:validate
```

## Sécurité

- Session participante, origine de confiance et CSRF obligatoires.
- Limite commune de 60 mutations de vote par minute et par IP.
- Contrôle de la soirée, du participant, de la playlist active et du statut du morceau.
- Contrainte unique `(trackId, participantId)` pour les morceaux.
- Contrainte unique `participantId` pour le choix d’ambiance.
- Transactions sérialisables pour le compteur et la décision de programmation.
- Une ressource d’une autre soirée reste inaccessible.
- Audit des mutations sans métadonnées musicales ou personnelles.

## Correspondance frontend/backend

| Parcours                    | Frontend                             | Backend                                       |
| --------------------------- | ------------------------------------ | --------------------------------------------- |
| Ajouter un vote de morceau  | Cœur non rempli                      | `POST /api/tracks/:id/votes`                  |
| Retirer le vote             | Cœur rempli avec `aria-pressed`      | `DELETE /api/tracks/:id/votes`                |
| Choisir une ambiance        | Bouton dans la carte                 | `POST /api/playlists/:id/votes`               |
| Déplacer le choix           | Vote sur une autre carte             | Mise à jour du vote unique                    |
| Retirer le choix            | Bouton « Vote ajouté »               | `DELETE /api/playlists/:id/votes`             |
| Afficher le seuil           | Compteur et verrouillage             | `evaluatePlaylistChange`                      |
| Programmer la suite         | Message « prendra le relais »        | `Party.scheduledPlaylistId`                   |
| Synchronisation transitoire | Invalidation et polling de 10 à 15 s | Événements Socket.IO prévus dans la Mission 8 |
