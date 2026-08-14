# API

Toutes les réponses d’erreur utiliseront à terme ce format :

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Message compréhensible.",
    "requestId": "request-id"
  }
}
```

## Health checks

### `GET /api/health`

Retourne l’état général du service.

### `GET /api/health/live`

Indique que le processus API est démarré.

### `GET /api/health/ready`

Vérifie PostgreSQL avec une requête minimale. Retourne `503` tant que la base n’est pas joignable.

Réponse :

```json
{
  "status": "ok",
  "service": "songfest-api",
  "timestamp": "2026-07-26T12:00:00.000Z"
}
```

## Comptes utilisateurs

L’utilisateur connecté utilise une session opaque dans le cookie `songfest_admin_session`. Le cookie
`songfest_admin_csrf`, lisible par le frontend, doit être recopié dans l’en-tête `X-CSRF-Token`
pour chaque mutation authentifiée. Les deux cookies sont `Secure` en production et `SameSite=Lax`.

### `POST /api/auth/register`

Crée un compte utilisateur puis ouvre sa session. Corps :

```json
{ "displayName": "Léa", "email": "lea@example.com", "password": "un-mot-de-passe-long" }
```

### `POST /api/auth/login`

Limite : 10 tentatives par IP et par tranche de 15 minutes.

Corps :

```json
{ "identifier": "lea@example.com", "password": "un-mot-de-passe-long" }
```

Réponse `200` : `{ "user": { "id": "uuid", "displayName": "Léa", "email": "lea@example.com" } }`.

### `GET /api/auth/me`

Retourne la session utilisateur courante. Réponse `401` si elle est absente ou expirée.

### `POST /api/auth/logout`

Révoque la session courante et efface ses cookies. Requiert `X-CSRF-Token`. Réponse `204`.

## Gestion initiale d’une soirée

### `GET /api/organizer/parties`

Retourne toutes les soirées appartenant à l’utilisateur connecté, de la plus récente à la plus ancienne.

### `POST /api/organizer/parties`

Crée une soirée en brouillon, ses réglages par défaut et son état de lecture. Requiert une session
utilisateur et `X-CSRF-Token`.

Corps :

```json
{ "name": "Anniversaire de Léa" }
```

Réponse `201` : `{ "party": PartySummary }`, avec un code lisible unique de six caractères.

### `GET /api/organizer/parties/:partyId`

Retourne uniquement une soirée appartenant à l’utilisateur connecté. Une autre soirée produit
volontairement un `404`.

### `POST /api/organizer/parties/:partyId/open`

Passe une soirée de `DRAFT` à `OPEN`. Requiert `X-CSRF-Token`. Une soirée terminée ne peut pas être
rouverte.

## Participation anonyme

### `GET /api/parties/:partyCode`

Retourne les seules informations publiques nécessaires à l’écran d’arrivée : identifiant, code,
nom, statut et références des playlists active ou programmée.

### `POST /api/parties/:partyCode/join`

Limite : 20 tentatives par IP et par tranche de 10 minutes. La soirée doit être `OPEN` ou `ACTIVE`.
Le pseudo est unique dans la soirée sans tenir compte de la casse.

Corps :

```json
{ "nickname": "Camille" }
```

Réponse `201` : participant temporaire et soirée publique. La session est écrite dans
`songfest_guest_session`, séparément de la session administrateur.

### `GET /api/participant/me`

Retourne le participant et sa soirée depuis la session anonyme. Un participant bloqué reçoit
`PARTICIPANT_BLOCKED`.

### `POST /api/participant/leave`

Révoque la session, marque le participant inactif et efface les cookies invités. Requiert le cookie
CSRF invité recopié dans `X-CSRF-Token`. Réponse `204`.

## Playlists

### `GET /api/organizer/parties/:partyId/playlists`

Retourne les playlists d’une soirée appartenant à l’administrateur, avec les nombres de morceaux,
contributeurs et votes. Requiert la session administrateur.

### `POST /api/organizer/parties/:partyId/playlists`

Crée une playlist. Requiert la session administrateur et `X-CSRF-Token`.

```json
{
  "name": "Années 2000",
  "description": "Les refrains que tout le monde connaît.",
  "visualKey": "pixel",
  "quotaPerParticipant": 5,
  "isOpen": true,
  "trackVotesEnabled": true,
  "explicitContentAllowed": false
}
```

Les valeurs possibles de `visualKey` sont `sunset`, `pixel`, `bass`, `pulse`, `midnight` et `free`.
Le nom est unique dans une soirée.

### `PATCH /api/organizer/playlists/:playlistId`

Modifie un ou plusieurs réglages. Un corps vide est refusé. Requiert `X-CSRF-Token`.

### `POST /api/organizer/playlists/:playlistId/activate`

Définit la playlist active et retire toute programmation précédente. Cette action ne lance pas
Spotify et ne coupe aucun morceau. La transition de lecture sera gérée par la Mission 9.

### `DELETE /api/organizer/playlists/:playlistId`

Supprime uniquement une playlist vide, non active et non programmée. Réponse `204`.

### `GET /api/parties/:partyId/playlists`

Requiert une session invitée appartenant à la soirée demandée. Retourne également
`participantTrackCount`, `remainingTrackQuota` et `participantHasVoted` pour chaque playlist. La
réponse contient aussi `playlistChange` : participants actifs, seuil courant, verrouillage restant,
activation des votes et playlist programmée.

## Spotify

Les tokens Spotify ne sont jamais renvoyés par l’API. Les routes administrateur vérifient la
session et la propriété de la soirée.

### `GET /api/organizer/parties/:partyId/spotify/status`

Vérifie que la soirée appartient à l’administrateur connecté, puis indique si les variables serveur
sont présentes, si son compte est connecté, la date de fin du refresh token et les scopes accordés.

### `POST /api/organizer/spotify/connect`

Requiert `X-CSRF-Token`. Vérifie que la soirée appartient à l’administrateur, écrit un cookie OAuth
temporaire et retourne une `authorizationUrl` Spotify. Le navigateur redirige ensuite vers Spotify :
aucun token n’est demandé à l’organisateur.

```json
{ "partyId": "uuid" }
```

### `GET /api/spotify/callback`

Callback OAuth appelé par Spotify. Vérifie la session administrateur, le cookie et le paramètre
`state`, échange le code côté serveur, puis redirige vers l’écran de configuration. Les paramètres
techniques ne sont jamais affichés à l’utilisateur.

### `GET /api/organizer/parties/:partyId/spotify/devices`

Retourne les appareils Spotify disponibles. Les appareils sans identifiant sont ignorés et les
appareils restreints sont signalés.

### `PUT /api/organizer/parties/:partyId/spotify/device`

Requiert `X-CSRF-Token`. Enregistre l’appareil de diffusion choisi après avoir vérifié sa présence
dans la liste Spotify actuelle.

```json
{ "deviceId": "identifiant-spotify" }
```

### `GET /api/organizer/parties/:partyId/spotify/playback`

Retourne le morceau et l’appareil détectés, la progression, la durée, l’état de lecture et un
`serverTimestamp`. Une absence de lecture retourne `track: null`.

### `GET /api/spotify/search?partyId=:partyId&q=:query`

Requiert la session d’un participant actif de cette soirée. La recherche contient de 2 à 100
caractères, retourne au maximum 10 titres et est limitée à 30 appels par minute et par IP.

## Morceaux

### `GET /api/playlists/:playlistId/tracks`

Requiert la session d’un participant actif appartenant à la soirée. Retourne les morceaux non
retirés dans leur ordre d’arrivée, avec les métadonnées Spotify conservées, le contributeur, le
statut et le nombre de votes.

### `POST /api/playlists/:playlistId/tracks`

Requiert le cookie CSRF invité dans `X-CSRF-Token`. Limite : 15 ajouts par minute et par IP.

```json
{ "spotifyTrackId": "11dFghVXANMlKmJXsNCbNl" }
```

Le navigateur ne fournit aucune métadonnée. L’API récupère le morceau depuis Spotify, puis vérifie
dans une transaction :

- l’appartenance du participant et l’ouverture de la playlist ;
- le quota et les éventuelles utilisations `EXTRA_TRACK` ;
- l’unicité du morceau dans la playlist ;
- les interdictions de l’organisateur ;
- l’historique récent de la soirée ;
- la durée maximale et le contenu explicite.

Réponse `201` :

```json
{
  "track": "PlaylistTrack",
  "quota": {
    "baseQuota": 5,
    "extraTrackUses": 0,
    "used": 2,
    "remaining": 3
  }
}
```

## Votes

Toutes les mutations de cette section exigent la session invitée, une origine autorisée et le
cookie CSRF invité recopié dans `X-CSRF-Token`. Elles partagent une limite de 60 appels par minute et
par IP.

### `POST /api/tracks/:trackId/votes`

Ajoute de manière idempotente le vote du participant. Le morceau doit être `PENDING`, les votes
doivent être actifs et sa playlist doit être la playlist courante.

### `DELETE /api/tracks/:trackId/votes`

Retire le vote lorsqu’il existe. Les deux routes renvoient :

```json
{
  "vote": {
    "trackId": "uuid",
    "voteCount": 4,
    "participantHasVoted": false
  }
}
```

### `POST /api/playlists/:playlistId/votes`

Crée ou déplace l’unique vote d’ambiance du participant. Le vote peut être enregistré pendant le
verrouillage temporel. Lorsque le seuil absolu, le pourcentage et la durée minimale sont satisfaits,
la playlist devient `scheduledPlaylistId`.

### `DELETE /api/playlists/:playlistId/votes`

Retire le vote du participant pour cette playlist. Une playlist déjà programmée reste programmée ;
seul l’administrateur pourra annuler cette décision.

La réponse inclut le compteur ciblé et l’état recalculé du changement :

```json
{
  "vote": {
    "playlistId": "uuid",
    "voteCount": 4,
    "participantHasVoted": true,
    "change": {
      "activeParticipantCount": 10,
      "requiredVotes": 4,
      "remainingLockMs": 0,
      "votesEnabled": false,
      "lockedByAdmin": false,
      "scheduledPlaylistId": "uuid"
    }
  }
}
```

## Socket.IO

Le client se connecte sur `/socket.io` avec les cookies de session. Le handshake refuse les
origines différentes de `WEB_ORIGIN` et les connexions sans session administrateur ou invitée
valide.

### Événements client vers serveur

- `party:subscribe` avec `{ "partyId": "uuid" }` : vérifie les droits puis rejoint la room serveur.
- `party:unsubscribe` avec le même payload : quitte la room.
- `party:resync-requested` : demande au client de recharger les ressources de la soirée.

Chaque événement renvoie un accusé `{ "ok": true }` ou une erreur publique
`INVALID_PAYLOAD`, `FORBIDDEN` ou `RATE_LIMITED`.

### Événements serveur vers client

Les événements ciblés sont `party:participant-joined`, `party:participant-left`,
`party:settings-updated`, `party:ended`, `playlist:created`, `playlist:updated`,
`playlist:activated`, `playlist:scheduled`, `playlist:vote-updated`, `track:added`,
`track:removed`, `track:vote-updated`, `track:selected`, `track:playing`, `track:played`,
`playback:updated`, `playback:skip-vote-updated`, `reward:assigned` et `reward:used`.

`state:resync-required` fournit une liste fermée parmi `party`, `participants`, `playlists`,
`tracks`, `playback`, `rewards` et `flash`. Toutes les notifications utilisent :

```json
{
  "partyId": "uuid",
  "version": 12,
  "occurredAt": 1785186000000,
  "data": {}
}
```

## Musique Flash

La Musique Flash est une opportunité limitée dans le temps attribuée à un participant actif. Le
morceau choisi ne consomme pas son quota, mais conserve les règles de durée, de contenu explicite,
de doublon et de rejeu récent. Dès que le participant valide son choix, SongFest interrompt le
morceau courant et démarre directement le morceau Flash sur l’appareil Spotify sélectionné.

### `GET /api/parties/:partyId/flash`

Requiert une session participante appartenant à la soirée. Retourne l’activation de la
fonctionnalité, le prochain horaire prévu et le tour `ACTIVE` ou `SUBMITTED`. Le booléen
`isCurrentParticipant` indique si le navigateur connecté doit afficher la recherche.

### `POST /api/parties/:partyId/flash/submit`

Requiert une origine autorisée, une session participante, le jeton CSRF et une limite de débit.
Seul le participant tiré au sort peut répondre, avant `expiresAt`.

```json
{ "spotifyTrackId": "11dFghVXANMlKmJXsNCbNl" }
```

Le morceau est persisté pour l’historique de lecture, mais reste exclu de la liste normale des
propositions, du quota et des compteurs de contribution du participant.

### `POST /api/organizer/parties/:partyId/flash/trigger`

Déclenche immédiatement un tirage équitable. La soirée doit être active et aucun autre tour ne doit
être en cours ou attendre sa lecture.

### `POST /api/organizer/parties/:partyId/flash/cancel`

Annule le tour courant. Un morceau déjà transmis à Spotify ne peut plus être retiré de sa file.

Événements associés : `flash:started`, `flash:submitted`, `flash:expired`, `flash:cancelled` et
`flash:played`.

## Lecture SongFest

### `GET /api/parties/:partyId/playback`

Retourne au participant de la soirée le morceau SongFest courant, le prochain morceau réservé,
l’ambiance active ou programmée, la progression persistée et le timestamp de la dernière
synchronisation Spotify.

SongFest conserve au maximum un prochain morceau dans la file Spotify et le prépare pendant la
dernière minute du titre courant. Une ambiance programmée reste prioritaire. Sinon, tous les titres
en attente de l’ambiance active sont joués avant qu’une autre playlist soit choisie. Quand elle est
épuisée, la prochaine playlist contenant des titres est automatiquement programmée selon l’ordre de
création des playlists, avec retour au début après la dernière.

La réponse contient aussi `skipVote` avec le nombre de votes, le seuil de majorité stricte, le vote
du participant courant et la disponibilité de l’action.

Le navigateur calcule la progression courante avec :

```text
progressMs + (Date.now() - serverTimestamp)
```

uniquement lorsque `isPlaying` vaut `true`.

### `GET /api/organizer/parties/:partyId/playback`

Retourne le même contrat après avoir vérifié la propriété administrateur.

### Contrôles administrateur

- `POST /api/organizer/parties/:partyId/playback/start`
- `POST /api/organizer/parties/:partyId/playback/pause`
- `POST /api/organizer/parties/:partyId/playback/resume`
- `POST /api/organizer/parties/:partyId/playback/skip`

Ces routes exigent une origine autorisée, la session administrateur et `X-CSRF-Token`. Elles sont
limitées à 30 commandes par minute et nécessitent une playlist active ainsi qu’un appareil Spotify
sélectionné. `start` passe la soirée à `ACTIVE`; les trois autres commandes refusent une soirée non
active.

### Vote collectif pour passer

- `POST /api/parties/:partyId/playback/skip-vote`
- `DELETE /api/parties/:partyId/playback/skip-vote`

Ces routes exigent une session participante active, l’origine autorisée et `X-CSRF-Token`. Un seul
vote est conservé par participant et morceau. Le morceau est passé dès que le nombre de votes est
strictement supérieur à la moitié des participants actifs non bloqués. Les compteurs sont diffusés
avec `playback:skip-vote-updated`.

## Pilotage et récompenses

Les mutations administrateur suivantes exigent une origine autorisée, la session administrateur,
`X-CSRF-Token`, la propriété de la soirée et sont limitées à 60 actions par minute et par IP.

### `GET /api/organizer/parties/:partyId/dashboard`

Retourne les réglages, les participants, leurs récompenses, les douze propositions les plus
récentes et le prochain morceau calculé. Les tokens et identifiants OAuth Spotify ne font jamais
partie de cette réponse.

### `PATCH /api/organizer/parties/:partyId/settings`

Modifie un ou plusieurs réglages de la soirée. Un corps vide ou une clé inconnue est refusé.

```json
{
  "defaultTrackQuota": 5,
  "minimumPlaylistVotes": 4,
  "minimumPlaylistVotePercentage": 40,
  "playlistLockMinutes": 15,
  "playlistVotesEnabled": true,
  "playlistChangeLockedByAdmin": false
}
```

Les champs omis conservent leur valeur actuelle.

### `POST /api/organizer/parties/:partyId/participants/:participantId/block`

Bloque le participant, le marque inactif, révoque toutes ses sessions et déconnecte ses sockets.
L’identifiant doit appartenir à la soirée administrée.

### `DELETE /api/organizer/parties/:partyId/tracks/:trackId`

Retire une proposition encore `PENDING`. Un motif facultatif de 300 caractères peut être fourni :

```json
{ "reason": "Version live non souhaitée" }
```

Un morceau sélectionné, envoyé à Spotify ou déjà joué n’est plus supprimable par cette route.

### `POST /api/organizer/parties/:partyId/tracks/:trackId/force`

Place un morceau `PENDING` de la playlist active au niveau de priorité administrateur. La décision
reste dans la file SongFest et ne remplit pas immédiatement la file Spotify.

### `POST /api/organizer/parties/:partyId/end`

Passe la soirée à `ENDED`, renseigne `endedAt`, rend les participants inactifs et révoque leurs
sessions. Les sockets invités reçoivent `party:ended` avant d’être déconnectés.

### `POST /api/organizer/rewards`

Attribue de une à dix utilisations d’une récompense à un participant non bloqué de la soirée.

```json
{
  "partyId": "uuid",
  "participantId": "uuid",
  "type": "DOUBLE_TRACK",
  "uses": 1
}
```

Les types acceptés sont `EXTRA_TRACK`, `PRIORITY_TRACK`, `DOUBLE_TRACK` et
`CHOOSE_NEXT_PLAYLIST`.

### `GET /api/participant/rewards`

Retourne les récompenses du participant actif identifié par sa session invitée.

### `POST /api/participant/rewards/use`

Requiert le cookie CSRF invité dans `X-CSRF-Token` et est limité à 20 utilisations par minute.

- `PRIORITY_TRACK` reçoit un seul `trackId` appartenant au participant dans la playlist active ;
- `DOUBLE_TRACK` reçoit exactement deux `trackIds` distincts, dans l’ordre souhaité ;
- `CHOOSE_NEXT_PLAYLIST` reçoit un `playlistId` ouvert, non actif et non déjà programmé ;
- `EXTRA_TRACK` est consommé automatiquement au prochain ajout dépassant le quota.

La validation et la consommation sont réalisées dans une transaction sérialisable. Un morceau
déjà récompensé, non `PENDING` ou appartenant à un autre participant est refusé.
