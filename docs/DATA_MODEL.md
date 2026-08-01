# Modèle de données

Le schéma de référence se trouve dans `prisma/schema.prisma`. La migration initiale ajoute les
contraintes PostgreSQL qui ne sont pas représentables directement dans Prisma.

## Invariants principaux

- Code de soirée unique sur six caractères.
- Un pseudo normalisé unique par soirée.
- Un titre Spotify unique par playlist.
- Un vote unique par participant et morceau.
- Un vote de skip unique par participant et morceau en cours.
- Un seul vote de playlist actif par participant.
- Une seule soirée `ACTIVE` par administrateur et compte Spotify.
- Une session appartient exactement à un administrateur ou à un participant.
- Un morceau ne peut être rattaché qu’à un seul tour Musique Flash.
- Les compteurs, quotas, durées et utilisations de récompenses ne peuvent pas être négatifs.

`PartySettings.playlistChangeLockedByAdmin` sépare le verrouillage ponctuel de l’administrateur de
la désactivation générale des votes. `Party.scheduledPlaylistId` mémorise la décision validée sans
activer immédiatement la playlist.

`PlaylistTrack.voteCount` est un compteur de lecture optimisé. Les lignes `TrackVote` restent la
source de vérité et le compteur est recalculé dans la transaction de chaque mutation.

## Sessions

La table `Session` stockera uniquement le hash SHA-256 du token opaque et celui du token CSRF. Le
token brut restera dans un cookie HttpOnly. Les contraintes SQL empêchent une session de référencer
plusieurs types d’acteurs.

## Lecture

`PlaybackState` mémorise le morceau applicatif courant, celui déjà envoyé à Spotify et l’éventuel
second morceau verrouillé par `DOUBLE_TRACK`. La file complète reste dans `PlaylistTrack`.

`TrackSkipVote` conserve les votes temporaires pour passer le morceau courant. Les votes sont
supprimés quand ce morceau se termine ou est passé, et le seuil est recalculé depuis les
participants actifs non bloqués.

## Musique Flash

`FlashTurn` conserve le participant tiré au sort, la playlist active au moment du tirage, le délai
de réponse et l’éventuel morceau choisi. Ses états sont `ACTIVE`, `SUBMITTED`, `EXPIRED`,
`CANCELLED` et `PLAYED`.

`PartySettings` contient l’activation, l’intervalle, le temps de réponse et le prochain horaire
persisté. Cette date permet de reprendre la planification après un redémarrage de l’API.

Un morceau Flash ne compte ni dans le quota, ni dans la liste normale des propositions, ni dans le
compteur de contribution du participant. Il reçoit une priorité de secours, mais sa soumission
commande d’abord une lecture Spotify immédiate et marque le morceau précédent comme passé.

## Suppressions

Les propositions sont normalement conservées avec le statut `REMOVED`. Les cascades SQL servent
surtout à la suppression finale d’une soirée et de ses données anonymes.
