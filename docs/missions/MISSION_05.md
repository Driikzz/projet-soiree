# Mission 5 - Spotify

## Objectif

Connecter le compte Spotify de l’organisateur sans exposer ses tokens, sélectionner l’appareil de
diffusion, vérifier la lecture et permettre aux invités de rechercher des morceaux.

## Fichiers principaux

- `packages/shared/src/schemas/spotify.ts` : contrats de statut, appareil, lecture et recherche.
- `apps/api/src/modules/spotify/spotify-token.service.ts` : échange et renouvellement des tokens.
- `apps/api/src/modules/spotify/token-encryption.ts` : chiffrement AES-256-GCM.
- `apps/api/src/modules/spotify/spotify-api.client.ts` : client Spotify authentifié et erreurs.
- `apps/api/src/modules/spotify/spotify.service.ts` : appareils, lecture et recherche autorisée.
- `apps/api/src/modules/spotify/spotify.routes.ts` : endpoints OAuth et REST.
- `apps/web/src/routes/admin-spotify-page.tsx` : connexion, appareil et test de lecture.
- `apps/web/src/components/spotify-search.tsx` : recherche invitée avec debounce.
- `docs/SPOTIFY_SETUP.md` : configuration locale et production.

## Critères d’acceptation

- Seul l’administrateur peut démarrer et terminer la connexion OAuth.
- Le paramètre `state` est vérifié avec un cookie temporaire HttpOnly.
- Les tokens restent uniquement en base, chiffrés côté serveur.
- L’access token est renouvelé automatiquement avant son expiration.
- Une connexion expirée ou révoquée réclame une nouvelle autorisation.
- L’administrateur voit les appareils disponibles, peut en sélectionner un et tester la lecture.
- Un participant actif peut rechercher au maximum 10 titres pour sa propre soirée.
- La recherche est limitée, validée et temporisée à 350 ms dans l’interface.
- Les réponses externes sont validées avant d’entrer dans le domaine SongFest.
- Aucun token, secret ou code OAuth n’apparaît dans une réponse ou un log.

## Tests attendus

- Aller-retour AES-256-GCM.
- Chiffrement non déterministe grâce à un IV aléatoire.
- Refus d’un token altéré ou d’une mauvaise clé.
- Validation des requêtes de recherche et des snapshots Spotify partagés.
- Parcours OAuth réel et appareils à tester avec un compte Spotify Premium configuré.

## Commandes

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## Sécurité

- Client secret et clé de chiffrement requis uniquement par l’API.
- Cookies OAuth `HttpOnly`, `SameSite=Lax`, `Secure` en production et durée de dix minutes.
- Comparaison du `state` en temps constant et contrôle du propriétaire de la soirée au départ et au
  retour.
- Trois scopes Spotify seulement, sans accès à la bibliothèque de l’organisateur.
- Une recherche vérifie la session, la soirée, le blocage et le statut actif du participant.
- Les erreurs Spotify sont nettoyées avant d’être renvoyées.
- Les sélections d’appareil sont auditées sans enregistrer leur identifiant ou leur nom.

## Correspondance frontend/backend

| Parcours             | Frontend                                        | Backend                                                   |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Statut Spotify       | `/admin/parties/:id/spotify`                    | `GET /api/admin/spotify/status`                           |
| Autorisation         | Bouton « Connecter Spotify »                    | `POST /api/admin/spotify/connect` puis callback OAuth     |
| Appareils            | Liste et sélection                              | `GET .../spotify/devices`, `PUT .../spotify/device`       |
| Test de lecture      | Pochette et état de lecture                     | `GET /api/admin/parties/:id/spotify/playback`             |
| Recherche invitée    | Champ dans le détail d’une playlist             | `GET /api/spotify/search?partyId=:id&q=:query`            |
| Ajout à une playlist | Bouton présent mais désactivé jusqu’à Mission 6 | Contrôle de quota et persistance prévus dans la Mission 6 |
