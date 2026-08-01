# Mission 8 - Temps réel

## Objectif

Notifier immédiatement les navigateurs d’une soirée après les mutations REST, puis recharger
uniquement les données concernées avec TanStack Query. PostgreSQL reste la source de vérité.

## Fichiers principaux

- `packages/shared/src/socket/events.ts` : événements, enveloppes, ressources et payloads Zod.
- `apps/api/src/socket/socket-server.ts` : connexion, validation, rooms et resynchronisation.
- `apps/api/src/socket/socket-auth.ts` : sessions et autorisations de soirée.
- `apps/api/src/socket/realtime-publisher.ts` : publication versionnée après les mutations REST.
- `apps/web/src/lib/realtime/use-party-realtime.ts` : connexion, reconnexion et cycle de vie.
- `apps/web/src/lib/realtime/realtime-listeners.ts` : traduction des événements en ressources.
- `apps/web/src/lib/realtime/query-resources.ts` : invalidation ciblée du cache.

## Critères d’acceptation

- Une connexion sans session valide est refusée.
- L’origine du handshake doit correspondre exactement à `WEB_ORIGIN`.
- Un administrateur ne rejoint que ses soirées et un participant actif uniquement la sienne.
- Les rooms sont dérivées côté serveur sous la forme `party:<uuid>`.
- Chaque payload entrant est validé par Zod et limité en fréquence.
- Les mutations restent dans l’API REST protégée par CSRF.
- Les notifications contiennent `partyId`, `stateVersion` et `occurredAt`.
- Les ajouts, votes, playlists et arrivées produisent un événement ciblé.
- Une suppression ou une modification large demande une resynchronisation ciblée.
- Le client se réabonne après reconnexion et resynchronise toutes les 60 secondes.
- Le polling existant reste un filet de sécurité temporaire.

## Tests attendus

- Payload de room strict et identifiant UUID.
- Liste fermée de ressources pouvant être resynchronisées.
- Parsing défensif des cookies.
- Nom de room serveur.
- Limite glissante des actions Socket.IO.
- Correspondance entre ressources et clés TanStack Query.
- Test d’intégration avec PostgreSQL et deux clients dès que Docker est disponible.

## Commandes

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## Sécurité

- Les cookies de session `HttpOnly` sont lus uniquement pendant le handshake serveur.
- Aucun token Spotify, token CSRF ou contenu de session n’est envoyé dans un événement.
- L’autorisation est revérifiée lors de chaque souscription et demande de resynchronisation.
- Un payload ne peut pas choisir directement un nom de room.
- La taille Socket.IO est limitée à 10 Ko et les actions à 30 par minute et par connexion.
- Les erreurs publiques sont stables et les détails techniques restent dans les logs redactés.

## Correspondance frontend/backend

| Parcours                    | Frontend                                 | Backend                              |
| --------------------------- | ---------------------------------------- | ------------------------------------ |
| Ouvrir une page de soirée   | Connexion puis `party:subscribe`         | Session, autorisation, `socket.join` |
| Ajouter un morceau          | Invalidation morceaux et playlists       | `track:added`                        |
| Voter                       | Mise à jour immédiate des compteurs      | Événement de vote ciblé              |
| Programmer une ambiance     | Message de changement actualisé          | `playlist:scheduled`                 |
| Perdre momentanément le Web | Badge hors ligne puis reconnexion        | Nouvelle authentification            |
| Corriger une dérive         | `party:resync-requested` toutes les 60 s | État versionné à recharger           |
