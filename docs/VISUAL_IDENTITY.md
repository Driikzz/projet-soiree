# Identité visuelle ROTATE

## Territoire

ROTATE transforme chaque soirée en édition musicale : référence de catalogue, label, sleeve,
stamp, Side A/Side B et liner notes. Ce vocabulaire reste contemporain et fonctionnel ;
l'interface ne simule pas un objet rétro et ne ressemble ni à un dashboard SaaS ni à Spotify.

Signature : **ROTATE — Record Culture**

Tagline : **THE NIGHT, RECORDED.**

## Tokens

| Rôle               | Token            | Valeur    |
| ------------------ | ---------------- | --------- |
| Rouge propriétaire | `--rotate-red`   | `#E53935` |
| Noir disque        | `--record-black` | `#11100E` |
| Papier sleeve      | `--sleeve`       | `#F1EEE6` |
| Gris label         | `--label-grey`   | `#AAA69D` |

Les variables sont définies dans `apps/web/src/styles/index.css`. Les états utilisent toujours un
libellé ou une icône en plus de la couleur.

## Typographie

- Display : Space Grotesk Variable, très grasse et compacte pour les grands moments de marque.
- UI : Atkinson Hyperlegible Next Variable pour rester lisible dans une pièce sombre et en mouvement.
- Les références et chiffres utilisent des graisses fortes et des chiffres tabulaires.

## Composition

- Structures éditoriales carrées, lignes et séparateurs nets.
- Arrondis réservés aux interactions, avatars et éléments physiques comme le disque.
- Rouge pour l'action et les moments de marque ; noir pour LIVE/CONTROL ; off-white pour JOIN et
  certaines surfaces éditoriales.
- Texture légère créée en CSS. Aucun grand asset décoratif n'est requis.

## Interaction

- Cibles tactiles de 48 px minimum.
- Feedback immédiat pour VOTE et PRESS, sans popup de confirmation.
- Motion courte pour les micro-interactions et plus expressive pour YOUR TURN.
- Toutes les animations respectent `prefers-reduced-motion`.

## Parcours mobile invité

Navigation principale : LIVE / ROTATION / PEOPLE, avec un bouton d'ajout persistant. Le player,
la rotation sociale et l'action prioritaire doivent être compris en moins de trois secondes.
