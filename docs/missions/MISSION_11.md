# Mission 11 - Finition visuelle et accessibilité

## Objectif

Finaliser l’identité SongFest sans modifier les règles métier, harmoniser les écrans invités et
organisateur, puis rendre les états de navigation, chargement, erreur et interaction explicites.

## Fichiers principaux

- `apps/web/src/styles/index.css` : fondations visuelles, responsive, focus et mouvement.
- `apps/web/src/main.tsx` : chargement des typographies auto-hébergées.
- `apps/web/src/app/route-accessibility.tsx` : titre de page, annonce et retour en haut.
- `apps/web/src/components/admin-party-nav.tsx` : navigation organisateur cohérente.
- `apps/web/src/components/loading-page.tsx` : squelette de chargement accessible.
- `apps/web/src/routes/not-found-page.tsx` : route 404 utile.
- `apps/web/src/routes/share-party-page.tsx` : erreurs explicites du QR code et du presse-papiers.
- `apps/web/public/favicon.svg` : marque navigateur légère.
- `docs/VISUAL_IDENTITY.md` : charte réellement appliquée.

## Critères d’acceptation

- Space Grotesk et Atkinson Hyperlegible Next sont réellement auto-hébergées.
- Aucun CDN de police n’est requis.
- Le thème reste sombre sur les parcours utilisés dans une pièce peu éclairée.
- Les actions principales, secondaires, votes et cartes ont des états survol et pression cohérents.
- Les survols ne sont activés que sur les appareils compatibles.
- Les mouvements utilisent uniquement transformation et opacité.
- `prefers-reduced-motion` réduit toutes les animations.
- Un lien d’évitement atteint le contenu principal.
- Le titre du document change avec la route.
- La navigation organisateur indique la section active avec `aria-current`.
- Les écrans de chargement, listes vides, récompenses sans cible et erreurs de copie sont explicites.
- Une URL inconnue affiche une 404 avec un retour React Router vers l’accueil.
- Les textes, champs, bordures et actions principales respectent les contrastes WCAG AA.
- Les vues à partir de 320 px ne nécessitent pas de défilement horizontal global.

## Tests attendus

- Présence et cible du lien d’évitement.
- Titre et contenu de la route 404.
- Annonce textuelle du chargement et squelettes décoratifs masqués.
- `aria-current="page"` sur la navigation organisateur.
- Tests frontend existants conservés après le changement de typographie et de navigation.

## Commandes

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Accessibilité et performance

- Les paires principales ont été contrôlées : texte secondaire sur fond principal `8.55:1`,
  métadonnées sur surface `4.95:1`, placeholder sur fond principal `4.73:1`.
- Les fontes utilisent des fichiers WOFF2 variables et `font-display: swap`.
- Le poids JavaScript initial reste proche de 111 Ko compressés.
- Les animations sont courtes, sans écouteur de défilement ni nouvelle dépendance de mouvement.
- Les pochettes et l’illustration principale conservent des alternatives textuelles.
- Les statuts ne sont jamais communiqués uniquement par la couleur.

## Correspondance frontend

| Besoin                         | Solution                                                |
| ------------------------------ | ------------------------------------------------------- |
| Navigation clavier             | Lien d’évitement et focus turquoise                     |
| Orientation dans l’admin       | Navigation persistante avec section active              |
| Changement de route            | Titre du document, annonce et retour en haut            |
| Chargement                     | Squelette visuel et message unique pour lecteur d’écran |
| Réduction du mouvement         | Media query globale et animations conditionnelles       |
| Échec du presse-papiers        | Message inline et lien invité toujours disponible       |
| Échec de génération du QR code | Code de soirée conservé et message de repli             |
| Petit écran                    | Navigation défilable et actions empilées                |
