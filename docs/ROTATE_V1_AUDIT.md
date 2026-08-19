# Audit de migration ROTATE V1

## Périmètre audité

- Monorepo npm : React 19/Vite/Tailwind CSS 4, Express 5, Socket.IO, Prisma/PostgreSQL.
- Routes web organisateur et invité, composants partagés, contrats `@songfest/shared`.
- Services Spotify, votes, skip collectif, playlists/ambiances, récompenses, Your Turn et fin de soirée.
- Trois planches de référence dans `Maquette/` : parcours invité, expérience host et host control.
- État initial vérifié : typecheck, lint et 114 tests passent.

## Forces

- Les mutations métier restent côté API et sont validées avec Zod, CSRF et contrôle de session.
- Socket.IO sert uniquement à invalider le cache ; PostgreSQL reste la source de vérité.
- Le vote de morceau est réversible et son poids limité existe déjà. La migration vers PRESS peut donc rester principalement visuelle.
- La recherche Spotify empêche déjà les doublons par contrainte et indique les morceaux présents.
- Le skip est déjà collectif et calculé depuis les participants actifs.
- Your Turn est persisté et possède un timer, un participant sélectionné et une soumission de morceau.
- Des briques ROTATE existent déjà : tokens, marque, référence ROT/, avatar abstrait, Track Card, Record et navigation mobile.

## Problèmes critiques

Aucun défaut critique bloquant la refonte n'a été observé. La base fonctionnelle et les tests sont sains.

## Haute priorité

### Deux systèmes visuels superposés

- Preuve : `apps/web/src/styles/index.css` contient 6 011 lignes ; la section ROTATE commence seulement à la ligne 3 678.
- Impact : cascade difficile à raisonner, nombreuses surcharges, maintenance risquée et risque de régression responsive.
- Action : remplacer la feuille par un système ROTATE unique couvrant uniquement les sélecteurs encore utilisés.
- Effort : important, risque moyen, vérifiable par tests et revue responsive.

### Parcours invité trop long

- Preuve : `guest-party-page.tsx` affiche LIVE, guide, player, actions, Your Turn, rotation, ambiances et people dans une seule page à ancres.
- Impact : la hiérarchie de la maquette mobile est perdue et l'action principale n'est pas comprise en trois secondes.
- Action : navigation LIVE / ROTATION / PEOPLE avec un CTA d'ajout persistant et conservation des mêmes queries/mutations.
- Effort : moyen.

### PEOPLE invité incomplet

- Preuve : seul `/api/participant/me` est disponible ; la liste complète est réservée au dashboard host.
- Impact : l'écran PEOPLE conceptuel ne peut pas être alimenté sans inventer de données.
- Action : exposer un résumé minimal des participants actifs de la soirée courante, protégé par la session invitée.
- Effort : petit à moyen.

### Host trop concentré

- Preuve : `admin-dashboard-page.tsx` mélange player, Your Turn, participants, modération, morceaux, règles et clôture.
- Impact : usage difficile pendant une soirée et divergence avec LIVE / MUSIC / PEOPLE / CONTROL.
- Action : renforcer les sections et la navigation sans dupliquer la logique métier ni créer de nouveaux pouvoirs host.
- Effort : moyen à important.

## Priorité moyenne

- Le flow de création n'a qu'une étape réelle ; les playlists, Spotify, appareil et lancement sont répartis sur les routes existantes.
- Le Record utilise les données disponibles mais ne possède pas encore durée, statistiques complètes ni export image.
- Certaines confirmations utilisent encore `window.confirm`, peu cohérent avec l'identité et difficile à styliser.
- Les noms internes `SongFest` subsistent dans le package, les cookies et quelques types. Les cookies doivent rester compatibles ; les noms purement applicatifs peuvent migrer.
- Les archives ne disposent que des agrégats présents dans `PartySummary` et le dashboard récent.

## Fonctionnalités conceptuelles nécessitant du backend

- Photo de profil personnalisée : stockage/upload et sécurité absents.
- Export partageable du Record : composant possible, rendu image et partage natif absents.
- Statistiques historiques complètes : agrégats dédiés et durée de soirée non exposés par les contrats actuels.
- Volume Spotify : lu depuis l'appareil mais aucune route de mutation n'existe.
- Limites fines par participant : le blocage existe ; les quotas/limites individuelles de la maquette n'existent pas.

## Scores initiaux

- Architecture : 8/10 — frontières web/API/shared nettes, orchestration mono-instance assumée.
- Sécurité : 8/10 — sessions opaques, CSRF, contrôle d'origine, rate limits et tokens chiffrés.
- Performance : 7/10 — invalidation ciblée et polling de secours ; CSS surdimensionné et listes non virtualisées.
- Maintenabilité : 6/10 — logique correcte, mais pages host volumineuses et cascade CSS doublée.
- Scalabilité : 6/10 — adaptée à une V1 mono-instance ; Socket.IO et verrous en mémoire limitent l'horizontalisation.
- Expérience développeur : 8/10 — scripts, docs, tests et types complets.
- Qualité du code : 7/10 — TypeScript strict et tests solides ; quelques composants/pages trop larges et vocabulaire historique.

## Plan de migration priorisé

1. Brand : terminer SongFest → ROTATE pour les textes, métadonnées et noms internes sans casser les cookies existants.
2. Foundation : reconstruire une seule feuille de styles avec tokens, typographie, surfaces, focus, motion et responsive.
3. Components : consolider Button, Track Card, ROT Reference, Stamp, Avatar Mark, navigation et états système.
4. Guest : Join, LIVE, ROTATION, ajout, PEOPLE réel, Mood, skip, Your Turn.
5. Host : collection, création, LIVE, MUSIC, PEOPLE/CONTROL, Spotify/appareil et fin.
6. After : Record et Your Records avec les données réellement disponibles.
7. Polish : loading, empty/error states, reduced motion, clavier, petits téléphones et desktop host.

## Garde-fous d'implémentation

- Aucun changement d'algorithme de vote, PRESS, sélection ou skip sans besoin métier démontré.
- Aucun faux chiffre ou participant inventé pour coller à une maquette.
- Les anciens styles ne sont supprimés qu'après couverture de tous les sélecteurs utilisés.
- Typecheck, lint, tests et build après chaque lot significatif.
