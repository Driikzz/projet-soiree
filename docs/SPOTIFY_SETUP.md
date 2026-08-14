# Configuration Spotify

SongFest utilise l’Authorization Code Flow côté serveur. Seul l’organisateur autorise Spotify ;
les invités n’ont ni compte Spotify ni token.

## Ce que voit l’organisateur

L’organisateur ne renseigne jamais de token. Depuis la page Spotify de sa soirée, il clique sur
« Se connecter avec Spotify », s’authentifie sur le site Spotify et accepte les autorisations. Le
callback associe ensuite le compte au propriétaire de la soirée.

Le `Client ID`, le `Client Secret` et la clé de chiffrement ci-dessous configurent une seule fois
l’application SongFest sur le serveur. Ce ne sont pas des tokens à copier par les utilisateurs.

## Prérequis

- Un compte Spotify Premium pour l’organisateur.
- Une application créée dans le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Une URL HTTPS publique pour la production.

Dans les réglages de l’application Spotify, ajoute exactement l’une des URL de redirection
suivantes :

- développement : `http://127.0.0.1:5173/api/spotify/callback`
- production : `https://songfest.example.com/api/spotify/callback`

Spotify n’accepte plus `localhost` comme URL de redirection. Utilise l’adresse explicite
`127.0.0.1` en local, y compris pour ouvrir le frontend.

## Variables d’environnement

Copie `.env.example`, puis renseigne :

```dotenv
SPOTIFY_CLIENT_ID=identifiant-de-l-application
SPOTIFY_CLIENT_SECRET=secret-de-l-application
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/api/spotify/callback
SPOTIFY_TOKEN_ENCRYPTION_KEY=cle-base64-de-32-octets
```

Génère une clé dédiée sans la réutiliser comme secret de session :

```sh
openssl rand -base64 32
```

Les quatre variables doivent être présentes ensemble. SongFest refuse de démarrer si la clé
décodée ne contient pas exactement 32 octets.

## Scopes

Le MVP demande uniquement :

- `user-read-private` (lecture de l’identifiant stable renvoyé par `GET /me`)
- `user-read-playback-state`
- `user-read-currently-playing`
- `user-modify-playback-state`

Ils couvrent l’association du compte, les appareils, le morceau courant et les commandes de
lecture prévues. Aucun scope de bibliothèque ou d’adresse e-mail n’est demandé.

## Parcours de connexion

1. Connecte-toi à l’espace organisateur et crée une soirée.
2. Ouvre « Spotify » depuis l’écran des playlists.
3. Clique sur « Se connecter avec Spotify » et autorise SongFest.
4. Lance Spotify sur l’appareil de diffusion.
5. Actualise les appareils, sélectionne celui de la soirée, puis lance le test.
6. Ouvre les entrées, active une playlist, puis utilise « Lancer la soirée ».

Le callback passe par le proxy Vite en développement. En production, le reverse proxy doit
transmettre `/api/*` à l’API et servir le frontend sur le même domaine.

À chaque étape, la session administrateur et la propriété de la soirée sont vérifiées. Le `state`
OAuth contient l’identifiant de la soirée et est comparé au cookie temporaire. La recherche invitée
résout ensuite le propriétaire depuis `Party.adminId` : elle ne peut donc pas utiliser le compte
Spotify d’un invité ou d’un autre organisateur.

## Durée de vie et reconnexion

- Un access token expire normalement après une heure ; l’API le renouvelle avec une marge d’une
  minute.
- Le refresh token d’une application du Developer Dashboard expire après six mois. Un
  renouvellement d’access token ne prolonge pas cette durée.
- Une réponse `invalid_grant` supprime la connexion devenue inutilisable et impose une nouvelle
  autorisation.

## Limites de développement

- Les commandes du player nécessitent Spotify Premium.
- En mode développement, le propriétaire de l’application doit avoir Premium et chaque compte de
  test doit être ajouté dans `Users Management` du Dashboard Spotify.
- La recherche est volontairement limitée à 10 titres par appel.
- Les réponses `429` sont converties en erreurs compréhensibles ; `QUOTA_EXCEEDED` est distingué
  d’un ralentissement temporaire.
- Un identifiant d’appareil Spotify n’est pas considéré comme permanent. L’organisateur peut
  resélectionner l’appareil si Spotify le remplace ou le rend indisponible.
- L’ordre des commandes Player n’est pas garanti par Spotify lorsqu’elles sont envoyées
  simultanément. SongFest les sérialise et ne garde qu’un morceau en avance.
- La file Spotify ne permet pas de retirer un élément par API. Un changement d’ambiance décidé
  après l’envoi du prochain morceau peut nécessiter l’action « Morceau suivant » de
  l’organisateur.

## Conditions d’utilisation

Les endpoints Player affichent des restrictions de politique importantes : compte Premium,
applications de streaming non commerciales et interdiction de transformer Spotify en diffusion
non interactive. SongFest est conçu pour une soirée privée où l’organisateur garde le contrôle
interactif du player. Avant une diffusion publique, commerciale ou à grande échelle, vérifie les
conditions Spotify applicables à ton usage ; l’intégration technique ne constitue pas une
autorisation de diffusion.

## Production

- Utilise une URL de callback HTTPS exacte et reporte-la dans `SPOTIFY_REDIRECT_URI`.
- Stocke le client secret et la clé de chiffrement dans le gestionnaire de secrets du serveur.
- Ne journalise jamais les codes OAuth, access tokens ou refresh tokens.
- Sauvegarde la clé de chiffrement : sa perte impose de reconnecter Spotify.
- Si la clé doit être remplacée, planifie une reconnexion plutôt qu’une rotation silencieuse des
  données existantes.
