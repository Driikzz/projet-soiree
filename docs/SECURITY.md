# Sécurité

## Mesures actives

- Helmet sur l’API.
- CORS limité à `WEB_ORIGIN`.
- Corps JSON limité à 100 Ko.
- Corps de formulaire limité à 20 Ko.
- Identifiant unique pour chaque requête.
- Redaction des cookies, autorisations, mots de passe et tokens dans les logs.
- En-têtes de sécurité Nginx et politique CSP restrictive.
- Conteneur API exécuté avec l’utilisateur non privilégié `node`.
- Validation Zod à toutes les frontières.
- Sessions opaques stockées sous forme de HMAC-SHA-256 avec un secret serveur.
- Cookies HttpOnly, Secure en production et SameSite Lax.
- Protection CSRF pour chaque mutation authentifiée.
- Mot de passe administrateur Argon2id.
- Rate limiting par IP sur la connexion et l’arrivée dans une soirée.
- Contrôles d’appartenance à la soirée sur chaque action.
- Journal d’audit sans données sensibles.
- Vérification stricte de l’en-tête `Origin` sur les requêtes mutantes.
- Authorization Code Flow Spotify exécuté entièrement côté serveur.
- Tokens Spotify chiffrés en AES-256-GCM avec IV aléatoire et données authentifiées.
- État OAuth comparé en temps constant et conservé dans un cookie HttpOnly de dix minutes.
- Renouvellement Spotify sérialisé par administrateur pour éviter les courses de tokens.
- Validation Zod des réponses Spotify avant leur utilisation.
- Rate limiting sur la recherche Spotify invitée.
- Relecture serveur des morceaux Spotify avant leur insertion ; les métadonnées du navigateur sont
  ignorées.
- Transactions sérialisables et contrainte unique PostgreSQL sur les ajouts de morceaux.
- Rate limiting, contrôle d’origine et CSRF sur les propositions musicales.
- Rate limiting, contrôle d’origine et CSRF sur les votes.
- Transactions sérialisables pour les compteurs de votes et la programmation d’une playlist.
- Vérification de la playlist active avant chaque vote de morceau.
- Origine stricte, session opaque et autorisation de soirée sur Socket.IO.
- Payloads Socket.IO stricts validés par Zod, limités à 10 Ko et à 30 actions par minute.
- Rooms Socket.IO dérivées exclusivement côté serveur à partir d’un UUID validé.
- Notifications temps réel sans cookies, tokens, secrets ou métadonnées d’authentification.
- Orchestrateur limité aux soirées actives et verrouillé par soirée contre les commandes
  concurrentes.
- Contrôles de lecture administrateur protégés par origine, session, CSRF, propriété et rate
  limiting.
- URIs Spotify issues uniquement des morceaux persistés après relecture du catalogue.
- Libération de la réservation locale lorsque Spotify refuse la commande.
- Tableau de bord administrateur filtré par propriétaire, sans secret ni token Spotify.
- Modération et attribution de récompenses protégées par origine, session, CSRF, validation Zod,
  contrôle de soirée et rate limiting.
- Utilisation des récompenses limitée au propriétaire anonyme, à ses morceaux `PENDING` et à la
  playlist active.
- Consommation des récompenses dans des transactions sérialisables pour éviter une double
  utilisation concurrente.
- Blocage et clôture révoquant les sessions avant la déconnexion des sockets invités.

`SESSION_SECRET` doit contenir au moins 32 caractères et n’a aucun défaut accepté en production.
Changer ce secret déconnecte toutes les sessions existantes.

## Mesures prévues

- Rate limiting combiné par IP et session si l’application dépasse le cadre d’une soirée privée.
- Procédure de rotation de la clé de chiffrement Spotify si le produit dépasse le cadre du MVP.
- Verrou distribué et adaptateur Socket.IO partagé avant tout déploiement de plusieurs instances
  API.

## Audit des dépendances

L’audit du 27 juillet 2026 signale une vulnérabilité haute dans le mode RSC de React Router
7.12-8.2. SongFest utilise uniquement le routeur déclaratif d’une SPA Vite, sans RSC, Server Actions
ou traitement de formulaires côté React Router. Le contournement proposé par npm installerait
React Router 7.11, qui est affecté par plusieurs vulnérabilités plus larges.

Décision temporaire : conserver React Router 7.18.1, ne pas activer ses fonctions serveur et mettre à
jour dès la publication d’une version corrigée. `npm audit fix --force` ne doit pas être utilisé
aveuglément.

L’audit complet compte sept alertes hautes : React Router et six entrées reliées à
`brace-expansion`/`minimatch` via ESLint. Ces dernières sont réservées aux outils de développement.
L’image d’exécution contient actuellement les dépendances de build pour permettre le seed ; elles ne
sont pas exposées comme surface HTTP. Une image plus minimale pourra séparer le seed dans une étape
dédiée après le MVP.
