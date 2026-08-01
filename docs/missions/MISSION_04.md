# Mission 4 - Playlists

## Objectif

Permettre à l’organisateur de structurer une soirée en plusieurs ambiances et permettre aux invités
de les consulter avec leur statut et leur quota propre.

## Fichiers principaux

- `packages/shared/src/schemas/playlists.ts` : commandes et réponses Zod.
- `apps/api/src/modules/playlists/playlist.service.ts` : propriété, CRUD et activation.
- `apps/api/src/modules/playlists/playlist.routes.ts` : routes administrateur et invité.
- `apps/web/src/routes/admin-playlists-page.tsx` : écran de gestion.
- `apps/web/src/components/playlist-form.tsx` : création et modification.
- `apps/web/src/components/playlist-card.tsx` : carte invitée.
- `apps/web/src/routes/playlist-detail-page.tsx` : quota et état de la playlist.

## Critères d’acceptation

- L’administrateur peut créer et modifier une playlist de sa soirée.
- Le nom est unique dans une soirée.
- Le quota accepte une valeur de 0 à 50 et vaut 5 par défaut.
- Les ajouts, les votes de morceaux et le contenu explicite sont configurables séparément.
- Six identités visuelles cohérentes sont disponibles.
- Une playlist peut être choisie comme playlist initiale ou active.
- Une playlist active ou contenant des morceaux ne peut pas être supprimée.
- Une soirée terminée refuse toute modification de playlist.
- Un invité ne peut consulter que les playlists de sa propre soirée.
- Le quota restant du participant est calculé pour chaque playlist.

## Tests attendus

- Valeurs par défaut d’une playlist.
- Bornes du quota.
- Refus d’un `PATCH` vide.
- Affichage textuel d’un état verrouillé.
- Tests d’intégration PostgreSQL du CRUD dès que Docker est disponible.

## Commandes

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

## Sécurité

- Toutes les mutations nécessitent la session administrateur et le jeton CSRF.
- L’appartenance de la soirée est vérifiée avant chaque lecture ou écriture.
- Les identifiants de route et les corps sont validés avec Zod.
- Une ressource d’un autre administrateur produit un `404` afin de ne pas confirmer son existence.
- Chaque mutation incrémente la version de la soirée et crée une entrée d’audit.

## Correspondance frontend/backend

| Parcours             | Frontend                                   | Backend                                       |
| -------------------- | ------------------------------------------ | --------------------------------------------- |
| Liste administrateur | `/admin/parties/:id/playlists`             | `GET /api/admin/parties/:id/playlists`        |
| Création             | Formulaire d’ambiance                      | `POST /api/admin/parties/:id/playlists`       |
| Modification         | Formulaire prérempli                       | `PATCH /api/admin/playlists/:id`              |
| Activation           | Action « Définir initiale » ou « Activer » | `POST /api/admin/playlists/:id/activate`      |
| Suppression          | Action confirmée                           | `DELETE /api/admin/playlists/:id`             |
| Liste invitée        | `/party/:id`                               | `GET /api/parties/:id/playlists`              |
| Détail invité        | `/party/:id/playlists/:playlistId`         | Même réponse mise en cache par TanStack Query |
