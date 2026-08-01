# Mini-charte visuelle SongFest

## Direction

SongFest reprend l’énergie directe des party games web sans imiter Spotify. L’interface doit rester
lisible sur téléphone dans une pièce sombre, avec une hiérarchie nette, des actions tactiles larges
et quelques formes expressives.

## Palette

| Rôle                 | Couleur   | Usage                              |
| -------------------- | --------- | ---------------------------------- |
| Fond principal       | `#101719` | Pages sombres                      |
| Surface              | `#182326` | Cartes et panneaux                 |
| Bordure              | `#2A393C` | Séparation sans ombre forte        |
| Texte principal      | `#F4F7F5` | Titres et contenus prioritaires    |
| Texte secondaire     | `#A8B5B1` | Explications                       |
| Primaire corail      | `#F47A55` | Action principale et identité      |
| Secondaire turquoise | `#55C7B4` | Focus, statut et information       |
| Accent ambre         | `#F8C66A` | Code de soirée et récompenses      |
| Erreur               | `#FF9B8C` | Validation et refus                |
| Succès               | `#7CE0CE` | Confirmation avec libellé ou icône |

Les couleurs fonctionnelles ne sont jamais le seul moyen de transmettre une information.

## Typographies

- Titres : `Space Grotesk Variable`, puis pile sans-serif système. Graisse 700, chasse serrée.
- Contenus : `Atkinson Hyperlegible Next Variable`, puis pile sans-serif système. Graisse 400 à 800.
- Les fontes variables sont auto-hébergées par Fontsource avec `font-display: swap`. Aucune requête
  vers un CDN de polices n’est effectuée par le navigateur.

## Échelle

- Espacements : `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64`, `96` px.
- Cartes : rayon de `24` px.
- Champs et boutons : rayon de `12` à `13` px.
- Badges d’état : forme pilule, uniquement lorsqu’ils décrivent un statut.
- Zones interactives : hauteur minimale de `48` px.
- Focus : contour turquoise de `3` px avec un décalage de `4` px.

## Ombres et surfaces

- Ombre de carte : `0 24px 64px rgb(3 12 14 / 22%)`.
- Les bordures légères définissent la majorité des surfaces.
- Aucun effet de verre, halo néon ou dégradé décoratif systématique.

## Composants

- Bouton primaire : fond corail, texte charbon, graisse 800, pression à `scale(0.98)`.
- Bouton secondaire : surface sombre, bordure visible, texte clair.
- Carte : surface sombre, bordure, rayon de 24 px, ombre teintée.
- Champ : label au-dessus, erreur en dessous, fond plus sombre que la carte.
- Badge : texte explicite comme « Entrées ouvertes » ou « Brouillon ».
- Vote inactif : bouton secondaire avec libellé et compteur.
- Vote actif : surface turquoise sombre, icône cochée et libellé « Ton vote ».
- Playlist active : bordure corail et texte « En cours ».
- Playlist programmée : accent ambre et texte « Prend le relais ensuite ».
- Playlist verrouillée : contraste réduit, icône cadenas et durée restante en toutes lettres.

## Illustration d’accueil

`apps/web/public/images/songfest-hero.jpg` est une illustration originale générée pour SongFest.
Elle utilise des volumes papier et argile, des enceintes, des disques et un groupe stylisé. Elle ne
contient ni texte, ni logo, ni référence visuelle directe à Spotify.

## Mouvement

- Entrée de page courte par translation verticale et opacité.
- Confirmation courte lors d’un ajout ou d’une programmation d’ambiance.
- Survol réservé aux appareils qui le prennent en charge.
- Retour tactile par réduction à `scale(0.98)`.
- Aucun mouvement permanent hors squelettes de chargement.
- Toutes les animations deviennent quasi instantanées avec `prefers-reduced-motion: reduce`.

## Navigation et accessibilité

- Lien d’évitement « Aller au contenu » visible au focus clavier.
- Titre du document et annonce discrète actualisés à chaque changement de route.
- Navigation organisateur horizontale et défilable sur mobile, avec `aria-current="page"`.
- 404 dédiée avec un retour réel vers l’accueil.
- États de chargement structurés et masqués aux technologies d’assistance ; une annonce textuelle
  unique indique le chargement.
- Écran de participation entièrement sombre pour rester confortable dans une pièce peu éclairée.
