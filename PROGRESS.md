# Progression SongFest

## Missions terminées

### Mission 1 - Initialisation

- Monorepo npm avec workspaces `web`, `api` et `shared`.
- TypeScript strict, ESLint et Prettier.
- Socles Express, Socket.IO, React, React Router, TanStack Query et Tailwind CSS.
- Helmet, CORS restreint, limites de payload et logs structurés avec redaction.
- Health checks, Docker Compose, Nginx et documentation initiale.
- Build frontend et backend validé.

### Mission 2 - Modèle métier

- Schéma Prisma PostgreSQL complet avec les 13 modèles métier et le modèle technique `Session`.
- Migration SQL initiale avec contraintes, index et unicités.
- Client Prisma sans moteur natif avec `@prisma/adapter-pg`.
- Seed administrateur Argon2id et données de démonstration facultatives.
- Readiness check PostgreSQL réel.
- Schémas Zod partagés pour soirées, playlists, morceaux et récompenses.
- Contrat d’erreur public et événements Socket.IO typés.
- Fonctions pures pour quotas, admissibilité d’un morceau, changement de playlist et sélection du
  prochain morceau.
- 27 tests validés, dont 20 tests métier indépendants du réseau.

### Mission 3 - Création et participation

- Authentification administrateur avec mot de passe Argon2id issu du seed.
- Sessions opaques distinctes pour l’administrateur et l’invité, hachées par HMAC-SHA-256.
- Cookies `HttpOnly`, `Secure` en production, `SameSite=Lax` et protection CSRF.
- Contrôle d’origine, validation Zod et rate limiting sur la connexion et la participation.
- Création d’une soirée en brouillon avec code lisible unique.
- Ouverture des entrées et vérification systématique du propriétaire administrateur.
- Consultation publique limitée, arrivée par pseudo et session anonyme.
- QR code, copie du lien et vue de partage adaptée à un écran projeté.
- Pages React de connexion, création, partage, participation et accueil invité.
- Illustration d’accueil originale optimisée à 411 Ko et mini-charte visuelle documentée.
- Documentation détaillée des routes et de la sécurité.
- 34 tests validés : 12 API, 2 frontend et 20 métier partagé.

### Mission 4 - Playlists

- Contrats Zod de création, modification et consultation des playlists.
- Six identités visuelles contrôlées dans le contrat partagé.
- CRUD administrateur avec contrôle de propriété et erreurs métier explicites.
- Quota configurable de 0 à 50, valeur par défaut de 5.
- Réglages séparés pour les ajouts, les votes et le contenu explicite.
- Activation d’une playlist initiale sans démarrer prématurément Spotify.
- Suppression limitée aux playlists vides, non actives et non programmées.
- Incrément de `stateVersion` et journal d’audit sur chaque mutation.
- Écran administrateur mobile-first de gestion des ambiances.
- Cartes invitées, détail, quota restant et états actifs ou verrouillés.
- Découpage des routes React : bundle initial réduit de 147 Ko à 108 Ko compressés.
- 38 tests validés : 12 API, 3 frontend et 23 métier partagé.

### Mission 5 - Spotify

- Authorization Code Flow côté serveur avec les trois scopes minimaux de lecture et contrôle.
- Cookie OAuth temporaire HttpOnly, `state` vérifié en temps constant et propriété de la soirée
  contrôlée avant et après l’autorisation.
- Access tokens et refresh tokens chiffrés en AES-256-GCM, jamais transmis au frontend.
- Renouvellement automatique anticipé et sérialisé par administrateur.
- Expiration du refresh token à six mois et reconnexion explicite après `invalid_grant`.
- Client Spotify centralisé avec validation Zod, nettoyage des erreurs et gestion des réponses 429.
- Recherche invitée limitée à 10 résultats, protégée par session, soirée et rate limiting.
- Consultation et sélection des appareils de diffusion.
- Test de lecture avec morceau, pochette, appareil, progression et timestamp serveur.
- Écran administrateur mobile-first et recherche Spotify avec debounce côté invité.
- Documentation locale et production de l’application Spotify.
- 44 tests validés : 15 API, 3 frontend et 26 métier partagé.

### Mission 6 - Ajout des morceaux

- Contrats partagés pour les morceaux persistés et le quota actualisé.
- Relecture obligatoire du catalogue Spotify à partir du seul identifiant envoyé par le navigateur.
- Ajout réservé à un participant actif de la soirée et à une playlist ouverte.
- Quota calculé par participant et par playlist, avec prise en charge de `EXTRA_TRACK`.
- Consommation automatique du bonus uniquement lorsque le quota de base est plein.
- Transactions sérialisables avec nouvelles tentatives sur les conflits concurrents.
- Contrainte unique conservée comme protection finale contre les doublons.
- Blocage des morceaux supprimés, interdits, trop longs, explicites ou récemment joués.
- Fenêtre de répétition et durée maximale issues des réglages de la soirée.
- Liste invitée avec pochette, artiste, contributeur, état, votes et attribution Spotify.
- Retours immédiats pour quota atteint, doublon et contenu explicite.
- Invalidation ciblée du cache après ajout, sans rechargement complet de la page.
- 49 tests validés : 15 API, 4 frontend et 30 métier partagé.

### Mission 7 - Votes

- Vote et retrait idempotents sur les morceaux `PENDING` de la playlist active.
- Vérification systématique du réglage `trackVotesEnabled`.
- Compteur de votes recalculé depuis la table source dans la transaction.
- État `participantHasVoted` inclus dans chaque réponse invitée.
- Un seul vote de changement d’ambiance par participant, déplacé lors d’un nouveau choix.
- Seuil calculé avec minimum absolu, pourcentage arrondi au-dessus et participants actifs.
- Votes accumulables pendant les quinze minutes de verrouillage par défaut.
- Programmation dans `scheduledPlaylistId` sans couper le morceau courant.
- Nouveau verrouillage administrateur persistant dans `PartySettings`.
- Messages explicites pour durée restante, verrouillage et prochaine ambiance.
- Actions accessibles avec `aria-pressed`, texte et zones tactiles d’au moins 44 px.
- Polling ciblé comme repli avant l’arrivée de Socket.IO dans la Mission 8.
- 54 tests validés : 15 API, 5 frontend et 34 métier partagé.

### Mission 8 - Temps réel

- Handshake Socket.IO limité à l’origine publique configurée et aux sessions opaques valides.
- Double identité administrateur/invité prise en charge sans exposer les cookies au code React.
- Autorisation de la soirée revérifiée à chaque souscription et resynchronisation.
- Rooms privées dérivées côté serveur sous la forme `party:<uuid>`.
- Payloads entrants stricts validés avec Zod et limite glissante de 30 actions par minute.
- Taille maximale d’un message réduite à 10 Ko.
- Événements ciblés après les arrivées, départs, mutations de playlists, ajouts et votes.
- Enveloppes contenant la version PostgreSQL réelle de la soirée.
- Suppressions et changements larges convertis en resynchronisations par ressource.
- Client React unique avec reconnexion automatique, réabonnement et resynchronisation périodique.
- Invalidation TanStack Query ciblée, sans transporter l’état métier complet dans les sockets.
- Badge accessible « En direct », « Synchronisation » ou « Hors ligne » sur l’accueil invité.
- Tests de validation, cookies, rooms, rate limiting et correspondance des caches ajoutés.
- 62 tests validés : 18 API, 7 frontend et 37 métier partagé.

### Mission 9 - Lecture automatique

- Orchestrateur périodique limité aux soirées `ACTIVE`, intervalle configurable à 15 secondes.
- Verrou local par soirée pour empêcher deux synchronisations Spotify concurrentes.
- Réconciliation du morceau Spotify observé avec `PlaybackState` et les statuts des propositions.
- Passage automatique `SELECTED`, `QUEUED`, `PLAYING`, puis `PLAYED`.
- Sélection via la fonction métier déterministe déjà testée : DOUBLE_TRACK, priorité, votes,
  équité, artistes récents et ancienneté.
- Réservation atomique d’un seul prochain morceau dans la file SongFest.
- Envoi Spotify repoussé à la dernière minute pour conserver plusieurs tentatives avant la fin du
  morceau tout en laissant les votes évoluer.
- Démarrage direct du premier morceau lorsqu’aucune lecture Spotify n’existe.
- Libération de la réservation après une erreur Spotify.
- Activation de l’ambiance programmée lors du changement de morceau, jamais au milieu.
- Endpoints invités et administrateur pour le snapshot de lecture.
- Commandes administrateur de lancement, pause, reprise et passage manuel.
- Carte invitée avec pochette, artiste, contributeur et progression calculée localement.
- Événements temps réel `track:selected`, `track:playing`, `track:played` et `playback:updated`.
- Documentation des limites Premium, file Spotify, quotas et conditions d’utilisation.
- 70 tests validés : 23 API, 9 frontend et 38 métier partagé.

### Mission 10 - Administration et récompenses

- Tableau de bord administrateur protégé réunissant lecture, participants, propositions et règles.
- Prochain morceau calculé avec la même fonction métier que l’orchestrateur, y compris pour
  l’ambiance programmée.
- Contrôles de lancement, pause, reprise et passage manuel accessibles depuis le dashboard.
- Suppression limitée aux propositions `PENDING` et priorité administrateur pour forcer un choix.
- Blocage d’un participant avec désactivation, révocation de toutes ses sessions et déconnexion de
  ses sockets.
- Réglages complets des quotas, durées, seuils, pourcentage et verrous via React Hook Form et Zod.
- Attribution des quatre récompenses à un participant non bloqué.
- `EXTRA_TRACK` consommé automatiquement lorsque le quota de base est plein.
- `PRIORITY_TRACK` appliqué à un morceau du bénéficiaire dans la playlist active.
- `DOUBLE_TRACK` appliqué à deux propositions distinctes et réservation du second à la lecture du
  premier.
- `CHOOSE_NEXT_PLAYLIST` permettant de programmer une ambiance ouverte depuis l’accueil invité.
- Consommation transactionnelle, compteur d’utilisations, audit et notifications Socket.IO.
- Clôture définitive avec statut `ENDED`, sessions invitées révoquées et sockets déconnectés.
- Interface mobile-first, états textuels, focus visibles et contrôles tactiles.
- 77 tests validés : 25 API, 10 frontend et 42 métier partagé.

### Mission 11 - Finition visuelle et accessibilité

- Space Grotesk Variable et Atkinson Hyperlegible Next Variable réellement auto-hébergées avec
  Fontsource et `font-display: swap`.
- Favicon SongFest géométrique léger et métadonnées Open Graph de base.
- Écran de participation entièrement sombre pour le confort dans une pièce peu éclairée.
- Navigation organisateur unifiée entre pilotage, playlists, Spotify et invitation.
- Section active indiquée visuellement et par `aria-current="page"`.
- Navigation mobile horizontale défilable sans élargir la page.
- Lien d’évitement, cible de contenu, titre dynamique et annonce discrète des changements de route.
- Route 404 dédiée avec un vrai lien React Router vers l’accueil.
- Squelettes de chargement structurés, avec une seule annonce pour les technologies d’assistance.
- Survols limités aux appareils compatibles et retours tactiles courts sur les contrôles.
- Animations de page et de confirmation utilisant uniquement transformation et opacité.
- Respect global de `prefers-reduced-motion`.
- États vides ajoutés aux propositions administrateur et aux récompenses sans cible disponible.
- Erreurs de lecture invitée, génération du QR code et copie du lien rendues explicites.
- Contrastes principaux mesurés au-dessus du seuil WCAG AA.
- Illustration d’accueil existante inspectée et conservée pour sa cohérence avec la palette.
- 80 tests validés : 25 API, 13 frontend et 42 métier partagé.

### Mission 12 - Tests et déploiement

- Base PostgreSQL 16 de test isolée, éphémère et liée à `127.0.0.1:5433`.
- Script d’intégration refusant de nettoyer toute base dont le nom ne se termine pas par `_test`.
- Parcours HTTP réel couvrant connexion, création, ouverture, playlist, participation et vote.
- Isolation entre organisateurs et unicité du vote vérifiées contre les contraintes PostgreSQL.
- Service Docker `migrate` exécutant `prisma migrate deploy` avant le démarrage de l’API.
- Client Prisma source ajouté à l’image afin que le seed fonctionne réellement en production.
- Ports PostgreSQL, API et web liés à la boucle locale par défaut.
- Nombre de proxies de confiance borné à zéro, un ou deux.
- Images Node 24 et Nginx construites avec succès.
- Stack complète démarrée sur une base vide : migrations, seed, API, Nginx et health checks validés.
- Smoke test de connexion administrateur réussi via le proxy Docker.
- CI GitHub Actions Node 24 avec PostgreSQL, migrations et parcours d’intégration.
- Script `check:release` réunissant formatage, lint, types, tests, build, Prisma et Compose.
- Guide de déploiement VPS avec HTTPS, sauvegarde, restauration, mise à jour et diagnostic.
- Procédure opérationnelle avant, pendant et après une soirée.
- Audit final documenté avec risques résiduels et feuille de route.
- 81 tests validés : 26 API dont 1 intégration, 13 frontend et 42 métier partagé.

### Ajustement Spotify après le MVP

- Bouton explicite « Se connecter avec Spotify » sans saisie ni copie de token.
- Écran connecté permettant de relancer OAuth pour changer de compte.
- Consentement Spotify réaffiché lors d’une reconnexion avec `show_dialog=true`.
- Statut Spotify désormais rattaché à une route de soirée et protégé par son propriétaire.
- Callback OAuth lié à la soirée et connexion persistée uniquement sur son `adminId`.
- Recherche invitée, appareils et lecture confirmés sur le compte du créateur via `Party.adminId`.
- Test PostgreSQL étendu pour refuser à un autre organisateur le statut Spotify de la soirée.
- Chargement du `.env` racine rendu explicite dans l’API, indépendamment du dossier courant du
  workspace npm.

## Décisions

- Node.js 24 LTS est la version de référence.
- npm workspaces est utilisé pour éviter un outil supplémentaire.
- Toutes les mutations métier passeront par REST.
- Socket.IO notifiera les clients et demandera des resynchronisations ciblées.
- La progression de lecture sera calculée localement à partir d’un timestamp serveur.
- Prisma 6.19.3 est conservé pour cette base, avec `prisma.config.ts` et l’adaptateur PostgreSQL.
- Les invariants non exprimables dans Prisma sont écrits explicitement dans la migration SQL.
- `selectNextTrack` est déterministe. DOUBLE_TRACK, priorité et votes forment les premiers niveaux,
  puis l’équité et l’historique des artistes départagent les candidats équivalents.
- Aucun store frontend global n’est installé.
- Les sessions administrateur et invité utilisent des cookies séparés pour permettre les tests dans
  un même navigateur.
- Les codes excluent `I`, `O`, `0` et `1` afin d’être lisibles à voix haute.
- La soirée est créée en `DRAFT`; une action explicite ouvre les entrées.
- L’activation d’une playlist ne change pas le statut de la soirée et ne commande pas Spotify.
- Les agrégats de contributeurs sont calculés côté PostgreSQL, sans charger les morceaux complets.
- Spotify utilise l’Authorization Code Flow, car le secret reste dans l’API et l’organisateur est le
  seul compte Spotify connecté.
- Seuls trois scopes Spotify sont demandés ; les tokens sont chiffrés avec une clé dédiée de 32
  octets et ne quittent jamais l’API.
- La sélection d’un appareil est stockée par soirée, sans considérer l’identifiant Spotify comme
  permanent.
- La recherche renvoie 10 morceaux au maximum pour respecter la limite actuelle du mode
  développement Spotify.
- Le frontend n’envoie qu’un identifiant Spotify lors d’un ajout ; les métadonnées persistées sont
  systématiquement relues par l’API.
- Les ajouts utilisent le niveau d’isolation `Serializable`, car la contrainte unique ne suffit pas
  à protéger un quota contre deux requêtes simultanées.
- Une utilisation `EXTRA_TRACK` consommée reste rattachée au morceau créé afin de calculer
  correctement le quota tant que ce morceau est actif.
- Les votes utilisent la même primitive de transaction sérialisable que les ajouts afin que le
  seuil ne soit jamais validé à partir d’un comptage concurrent incohérent.
- Les votes de playlist sont autorisés pendant le verrouillage temporel ; seule leur validation
  attend la fin de la période.
- Une décision validée est figée dans `scheduledPlaylistId`. Le retrait tardif d’un vote ne
  l’annule pas implicitement.
- Socket.IO est un canal de notification ; PostgreSQL et l’API REST restent la source de vérité.
- L’adaptateur Socket.IO en mémoire correspond au déploiement MVP à une seule instance API.
- Le client demande une resynchronisation toutes les 60 secondes en plus du réabonnement.
- L’orchestrateur de lecture reste dans le processus API pour le MVP mono-instance.
- Un seul prochain morceau est envoyé à Spotify pendant la dernière minute.
- Spotify ne permet pas de retirer un morceau de sa file par l’API ; le passage manuel reste le
  filet de sécurité d’un changement d’ambiance très tardif.
- Les récompenses restent des objets explicites, sans moteur générique de règles : chaque effet du
  MVP est traité directement dans le service métier.
- Un groupe `DOUBLE_TRACK` ne réserve son second titre qu’au démarrage réel du premier afin de ne
  pas remplir prématurément la file Spotify.
- Le dashboard utilise les mêmes endpoints REST et événements de resynchronisation que les écrans
  spécialisés ; aucune seconde source d’état frontend n’est introduite.
- Les typographies sont livrées dans le bundle frontend afin d’éviter les dépendances réseau et les
  transferts de données vers un fournisseur de polices.
- Les animations restent en CSS : aucune bibliothèque de mouvement n’est justifiée pour les retours
  courts du MVP.
- La navigation d’invitation conserve une présentation distincte, adaptée à une projection ; les
  trois surfaces de configuration partagent la navigation organisateur complète.
- Une base `songfest_test` séparée et temporaire est obligatoire pour l’intégration.
- Les migrations de production sont un service Compose ponctuel dont l’API dépend explicitement.
- Les ports publiés restent sur `127.0.0.1` ; le domaine public passe par un reverse proxy HTTPS.
- `TRUST_PROXY=2` correspond au parcours VPS Caddy → Nginx Docker → Express.
- La CI reproduit les validations locales sur Node 24 et PostgreSQL 16.
- L’organisateur ne saisit jamais de token Spotify ; les identifiants d’application sont une
  configuration serveur et OAuth associe le compte au créateur de la soirée.

## Problèmes et vérifications différées

- La machine utilise Node.js 23.9.0. Certaines dépendances récentes excluent les versions Node
  impaires. Docker et la documentation ciblent Node 24.
- L’espace de travail empêche la création du dossier `.git`. L’initialisation Git reste à effectuer
  hors de cette session.
- L’audit de dépendances est documenté dans `docs/SECURITY.md`.
- BuildKit de Docker Desktop échoue sur cette machine avec un en-tête de session contenant un
  caractère non imprimable. La construction de validation a réussi avec `DOCKER_BUILDKIT=0`; la
  définition Docker elle-même est valide.
- Le parcours Spotify complet doit être validé manuellement avec le compte Premium, l’application
  Dashboard et l’appareil réels de l’organisateur.

## Commandes utiles

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
npm run check:release
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
docker compose config
docker compose up --build
```

## Prochaine étape

Déployer sur le domaine HTTPS définitif, configurer l’application Spotify réelle, puis exécuter la
checklist de `docs/PARTY_RUNBOOK.md` avec l’appareil de diffusion.

## Amélioration expérience invitée et Musique Flash

### Terminé

- Accueil invité restructuré autour d’un bouton principal « Proposer un son ».
- Mini-guide en trois gestes affiché à la première visite et mémorisé localement.
- Quota restant visible dans l’action principale.
- Aperçu et vote des prochains morceaux de la playlist active directement sur l’accueil.
- Libellés séparant explicitement l’ouverture d’une playlist et le vote d’ambiance.
- Barre d’actions fixe mobile : proposer, voter et changer d’ambiance.
- Nouveau modèle persistant `FlashTurn` avec migration PostgreSQL.
- Tirage aléatoire équitable excluant les gagnants récents tant que le groupe n’a pas tourné.
- Expiration automatique sans action sur le morceau Spotify en cours.
- Soumission Flash hors quota avec toutes les validations musicales existantes.
- Démarrage immédiat du morceau Flash avec interruption du morceau en cours via Spotify.
- Les morceaux Flash sont exclus du quota, de la liste des propositions et des compteurs de
  contribution du participant.
- Le bouton administrateur « Passer » sélectionne et démarre directement le prochain morceau
  SongFest au lieu de dépendre uniquement de la file Spotify.
- Vote collectif de skip persistant, unique par participant et par morceau.
- Majorité stricte calculée sur les participants actifs non bloqués :
  `floor(participantsActifs / 2) + 1`.
- Bouton invité « Voter pour passer » avec compteur, retrait du vote et état temps réel.
- Événement Socket.IO ciblé `playback:skip-vote-updated` et resynchronisation après changement de
  morceau.
- Continuité renforcée : le prochain titre est préparé pendant la dernière minute, avec jusqu’à
  quatre tentatives au rythme de synchronisation par défaut.
- Tous les morceaux `PENDING` de l’ambiance active restent prioritaires tant qu’aucune autre
  ambiance n’a été programmée.
- Quand la playlist active est épuisée, la prochaine playlist non vide est programmée
  automatiquement dans l’ordre de création, avec parcours cyclique.
- Une playlist programmée mais vide est ignorée afin d’éviter une coupure inutile.
- Événements Socket.IO `flash:started`, `flash:submitted`, `flash:expired`,
  `flash:cancelled` et `flash:played`.
- Commandes administrateur pour tirer immédiatement ou annuler un tour.
- Réglages administrateur : activation, intervalle et temps de réponse.
- Tests métier du tirage, sécurité HTTP, interface Flash et invalidation temps réel.
- Migration appliquée avec succès sur PostgreSQL de test et parcours d’intégration validé.
- 99 tests unitaires/composants et 1 parcours PostgreSQL validés.

### Décisions

- La Musique Flash est un concept métier dédié, pas une récompense.
- L’intervalle par défaut est de 60 minutes et le délai de réponse de 120 secondes.
- Un choix Flash ne consomme pas le quota, mais respecte durée, explicite, doublons et rejeu récent.
- Un choix Flash utilise la commande de lecture directe Spotify afin de devenir immédiatement le
  morceau courant. Un morceau SongFest déjà réservé est remis en attente.
- L’expiration abandonne uniquement l’opportunité Flash ; elle ne passe jamais le morceau en cours.
- Un vote de skip ne peut viser que le morceau SongFest courant. Les votes sont supprimés dès que
  ce morceau est terminé ou passé.
- La majorité est volontairement stricte : pour 4 participants actifs, 3 votes sont nécessaires ;
  pour 5 participants, 3 votes suffisent.
- Une ambiance choisie explicitement reste prioritaire si elle contient un morceau. Sans choix
  explicite, l’ordre de création des playlists définit la suite automatique.
- L’image API attribue explicitement les fichiers Prisma à l’utilisateur `node`, ce qui permet au
  service de migration de fonctionner même si les fichiers du VPS ont été copiés avec des droits
  restrictifs.

### Commandes après mise à jour

```sh
npm run db:generate
npm run db:migrate
npm run dev
npm test
npm run test:integration
```

### Prochaine étape

Appliquer la migration locale, lancer une soirée active et utiliser « Tirer maintenant » pour
valider le parcours réel avec plusieurs navigateurs.
