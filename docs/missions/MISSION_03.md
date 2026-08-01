# Mission 3 — Création et participation à une soirée

## Objectif

Permettre à l’organisateur de se connecter, créer puis ouvrir une soirée, et permettre à un invité
de la rejoindre avec un pseudo depuis un lien ou un QR code.

## Fichiers principaux

- `apps/api/src/modules/auth/` : sessions, cookies, connexion et protections.
- `apps/api/src/modules/parties/` : code de soirée, création, ouverture et participation.
- `apps/web/src/routes/admin-login-page.tsx` : connexion de l’organisateur.
- `apps/web/src/routes/create-party-page.tsx` : création du brouillon.
- `apps/web/src/routes/share-party-page.tsx` : QR code, code et ouverture.
- `apps/web/src/routes/join-party-page.tsx` : arrivée et pseudo invité.
- `apps/web/src/routes/guest-party-page.tsx` : confirmation de participation.
- `packages/shared/src/schemas/` : contrats Zod d’authentification et de soirée.

## Critères d’acceptation

- Un mot de passe Argon2id issu du seed ouvre une session administrateur.
- Un administrateur ne peut lire ou modifier que ses propres soirées.
- La création produit un code unique lisible, des réglages et un état de lecture.
- Le QR code correspond exactement à `/join/:partyCode`.
- Seules les soirées ouvertes ou actives acceptent un participant.
- Le pseudo est unique dans une soirée, sans tenir compte de la casse.
- Les sessions administrateur et invité peuvent coexister dans un navigateur.
- Quitter révoque la session et marque le participant inactif.

## Tests attendus

- Format et entropie des codes de soirée.
- Génération, hachage HMAC et comparaison des jetons de session.
- Refus d’une origine non autorisée.
- Validation Zod avant accès à la base.
- Rendu de la page d’arrivée avec le nom de soirée et le champ pseudo.
- Parcours complet contre PostgreSQL dès que Docker est disponible.

## Commandes

```sh
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
npm test
```

## Sécurité

- Jetons de session aléatoires de 256 bits, jamais persistés en clair.
- HMAC-SHA-256 avec `SESSION_SECRET` côté serveur.
- Cookies `HttpOnly`, `SameSite=Lax` et `Secure` en production.
- Double soumission CSRF avec vérification du hash enregistré.
- Contrôle strict de l’origine sur toutes les mutations.
- Limitation par IP de la connexion et de la participation.
- Réponses d’authentification volontairement peu précises.
- Journal d’audit sans pseudo, mot de passe, cookie ou token.

## Correspondance frontend/backend

| Parcours             | Frontend                   | Backend                                        |
| -------------------- | -------------------------- | ---------------------------------------------- |
| Connexion            | `/admin/login`             | `POST /api/admin/auth/login`                   |
| Création             | `/admin/parties/new`       | `POST /api/admin/parties`                      |
| Partage et ouverture | `/admin/parties/:id/share` | `GET /api/admin/parties/:id`, `POST .../open`  |
| Arrivée invitée      | `/join/:partyCode`         | `GET /api/parties/:partyCode`, `POST .../join` |
| Session invitée      | `/party/:partyId`          | `GET /api/participant/me`, `POST .../leave`    |
