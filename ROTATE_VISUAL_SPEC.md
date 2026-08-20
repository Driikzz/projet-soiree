# ROTATE — Visual Specification

Références principales : `Maquette/inviteuser.png` pour Guest et
`Maquette/dashboardadmin.png` pour Host, écran mobile de travail `390 × 844 px`.

## Fondations

### Couleurs

| Token                 | Valeur    | Usage observé                                     |
| --------------------- | --------- | ------------------------------------------------- |
| `--rotate-red`        | `#E53935` | statut LIVE, labels, position 01, CTA, vote actif |
| `--record-black`      | `#11100E` | fond LIVE, navigation, disque, texte sur rouge    |
| `--record-black-soft` | `#181714` | lignes fonctionnelles légèrement relevées         |
| `--sleeve`            | `#F1EEE6` | JOIN, papier, tickets et surfaces éditoriales     |
| `--sleeve-deep`       | `#DDD8CE` | séparateurs et zones papier secondaires           |
| `--label-grey`        | `#AAA69D` | métadonnées sur fond noir                         |
| `--ink-muted`         | `#6F6B64` | métadonnées sur sleeve                            |

La texture papier est limitée à JOIN et aux surfaces Record. LIVE reste propre et noir.

### Espacement mobile

| Token       | Valeur |
| ----------- | ------ |
| `--space-1` | `4px`  |
| `--space-2` | `8px`  |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

Gutter JOIN : `14–16px`. Gutter LIVE : `14px`. Les séparations internes utilisent surtout 8,
12 et 16 px.

### Typographie

| Rôle         | Mobile 390                | Graisse / rythme                           |
| ------------ | ------------------------- | ------------------------------------------ |
| `display-xl` | `clamp(64px, 20vw, 82px)` | 900, line-height `.76`, tracking `-.085em` |
| `display-lg` | `clamp(46px, 14vw, 58px)` | 900, line-height `.82`, tracking `-.075em` |
| `heading`    | `24px`                    | 850, line-height `.9`, tracking `-.045em`  |
| `body`       | `15px`                    | 450, line-height `1.35`                    |
| `small`      | `12px`                    | 500, line-height `1.25`                    |
| `label`      | `10px`                    | 800, tracking `.08em`, uppercase           |
| `metadata`   | `10–11px`                 | 500, tabular figures                       |

Display et UI : Barlow Condensed. Les titres utilisent 700–900, l’UI 400–600. La condensation
provient de la fonte elle-même ; le tracking n’est resserré que sur les grands titres.
Le wordmark `ROTATE` utilise Barlow 800–900, plus large comme sur les planches.

Le HOST emploie une paire volontairement plus souple : Outfit Variable 650–750 pour les grands
titres musicaux (`EN COURS`, morceau) et Barlow 400–600 pour l’UI. Barlow Condensed n’est pas
utilisée comme display sur HOST LIVE.

### Surfaces, bordures et radius

- Structure éditoriale : radius `0`.
- Shell téléphone/JOIN : `18px` uniquement pour reprendre la sleeve de la planche.
- Inputs et boutons : `6px`.
- Track rows : `8px` sur la ligne complète, bouton carré `5px`.
- Border fonctionnelle : `1px solid` avec 18–24 % de contraste.
- Pas d'ombre de card. Seul le CTA flottant peut utiliser une ombre courte noire.

## Composants partagés

- `RotateBrand` : wordmark lourd, point rouge, sous-label Record Culture uniquement hors app.
- `RotReference` : `ROT/XXXX`; rouge sur noir, noir/rouge sur sleeve; LIVE aligné à droite.
- `AvatarMark` : disque abstrait 36–42 px, variantes géométriques, jamais emoji.
- `TrackCard` : position dominante, artwork, titre/artiste, proposant, score, VOTE puis PRESS.
- `BottomNavigation` : LIVE / ROTATION / PEOPLE, 58 px hors safe-area, actif rouge.
- `LiveIndicator` : point rouge + `LIVE`, label 10 px.
- `RecordSurface` : sleeve claire, texture légère et bord fin.

## Écran JOIN

Ordre à `390 × 844` :

1. Sleeve off-white occupant toute la largeur utile, marge extérieure 12–14 px.
2. Ligne `ROT/XXXX` à gauche et `● LIVE` à droite.
3. Nom de soirée display 48–56 px sur 1–2 lignes.
4. Date, preview des participants en chevauchement, compteur `+N`.
5. Métadonnée `N PEOPLE ALREADY IN`.
6. Label pseudo, input 48 px.
7. CTA rouge 52 px, pleine largeur.
8. Séparateur fin.
9. `YOUR MARK — OPTIONAL`, quatre marks et action photo secondaire.

Le logo global et le panneau noir sont absents de cet écran dans la référence.

## Écran LIVE

Ordre à `390 × 844` :

1. Ligne `ROT/XXXX` / `● LIVE`, padding top avec safe-area.
2. Nom 24 px, puis `N PEOPLE · MOOD` en 10 px avec mood rouge.
3. Pochette physique verticale environ `180 × 246px`, centrée, avec artwork Spotify carré non recadré dans une sleeve et disque partiellement visible à droite.
4. `NOW PLAYING`, titre 22 px, artiste 13 px.
5. Barre de progression 3 px et temps 10 px.
6. `UP NEXT`, puis exactement deux lignes encadrées compactes d'environ 58 px.
7. Chaque ligne : position rouge, titre/artiste, score, action VOTE explicite.
8. Navigation basse 58 px + safe area; CTA Add rouge circulaire de 52 px, centré et superposé.

Le guide d'utilisation, le profil courant, les panneaux Mood et les cartes secondaires ne doivent
pas interrompre le premier viewport LIVE. Ils restent accessibles ailleurs dans le parcours.

## Écran HOST LIVE

Ordre à `390 × 844` selon `dashboardadmin.png` :

1. Ligne `ROT/XXXX`, `● LIVE` et compteur People.
2. Titre arrondi `EN COURS.` et index `SIDE A` discret.
3. Artwork carré dominant avec vinyle partiellement sorti et ambiance colorée très diffuse issue de
   la pochette.
4. `NOW PLAYING`, titre, artiste, progression et durées.
5. Contrôles centrés : pause/reprise, morceau suivant, accès aux actions secondaires.
6. Trois indicateurs compacts : votes, ambiance et people.
7. `FILE D’ATTENTE / SIDE A`, puis une TrackCard partagée.
8. Navigation basse `LIVE / ROTATION / PEOPLE / CONTROL`, 64 px hors safe area.

Les outils rares (YOUR TURN, modération, règles, fin de soirée) restent fonctionnels mais commencent
sous le premier viewport ; ils ne concurrencent plus le morceau en cours.

## Viewports et adaptation

- Référence : `390 × 844`.
- Contrôles obligatoires : `320 × 700`, `360 × 800`, `430 × 932`.
- Desktop host futur : `1440 × 900`, hors scope de cette passe.
- Gutters via `clamp(10px, 3.6vw, 16px)`; titres via `clamp()` sans modifier la hiérarchie.
- `padding-top` et `padding-bottom` incluent `env(safe-area-inset-top/bottom)`.

## Écarts observés avant reconstruction

### JOIN

- Panneau noir séparé absent de la maquette.
- Logo ROTATE trop présent; la référence commence directement par la référence catalogue.
- Nom et formulaire répartis sur deux surfaces au lieu d'une seule sleeve.
- Absence du nombre et de la preview des participants.
- Un seul mark généré au lieu du sélecteur horizontal.
- Densité verticale et rayon général éloignés de la planche.

### LIVE

- Header sticky et profil `YOU` non présents dans la référence.
- Titre de soirée surdimensionné par rapport au titre compact de LIVE.
- Player horizontal au lieu de l'artwork central avec disque derrière.
- Guide FIRST PRESS visible avant le contenu principal.
- UP NEXT absent du premier viewport; la rotation arrive beaucoup trop bas.
- Panneau Current Mood et CTA occupent la place réservée à UP NEXT.
- Tabbar trop détachée de la composition et CTA Add aligné à droite au lieu d'être centré.
