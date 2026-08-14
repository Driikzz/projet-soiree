# Procédure de lancement d’une soirée

Cette checklist est conçue pour l’organisateur. Elle complète le guide technique sans demander
d’accès au serveur pendant la soirée.

## La veille

- Vérifier que le déploiement et `/api/health/ready` sont verts.
- Ouvrir SongFest sur le téléphone et l’ordinateur qui affichera le QR code.
- Vérifier que le compte organisateur possède Spotify Premium.
- Reconnecter Spotify si l’autorisation a expiré.
- Préparer l’appareil de diffusion, son chargeur et une connexion réseau stable.
- Créer les ambiances, régler leurs quotas et contrôler le contenu explicite.
- Régler le nombre de flammes disponibles par participant ; la valeur par défaut est `5`.
- Choisir une playlist initiale et tester une lecture avec un morceau non important.

## Une heure avant

1. Lancer Spotify sur l’appareil relié aux enceintes.
2. Ouvrir l’espace organisateur SongFest.
3. Aller dans « Spotify », actualiser les appareils et sélectionner le bon appareil.
4. Lancer le test de connexion et confirmer le titre, la progression et le son.
5. Vérifier les seuils de changement d’ambiance et le verrouillage initial.
6. Ouvrir les entrées de la soirée.
7. Afficher la page d’invitation en plein écran et scanner soi-même le QR code.
8. Rejoindre avec un pseudo de test, proposer un morceau et vérifier sa remontée sur le dashboard.

Supprime le participant et la proposition de test si tu ne veux pas les conserver.

## Au début de la soirée

- Expliquer en une phrase : « Scannez, choisissez un pseudo, proposez et votez ; aucun compte
  Spotify n’est nécessaire. »
- Garder le dashboard ouvert sur un appareil chargé.
- Activer la première ambiance, puis utiliser « Lancer la soirée ».
- Confirmer que la barre de progression et les présences se mettent à jour.

## Pendant la soirée

- Laisser SongFest choisir le prochain titre ; ne remplis pas manuellement la file Spotify.
- Utiliser « Forcer » avec parcimonie pour conserver la confiance dans les votes.
- Supprimer une proposition problématique avant qu’elle ne soit sélectionnée.
- Bloquer un participant uniquement en cas d’abus manifeste.
- Attribuer `DOUBLE_TRACK` lorsqu’une personne doit choisir deux titres consécutifs.
- Surveiller l’ambiance programmée : elle prendra le relais à la fin du morceau en cours.
- Si un appareil Spotify disparaît, relancer Spotify, actualiser les appareils et le sélectionner à
  nouveau.

## Diagnostic rapide

### L’interface indique « Hors ligne »

Vérifie le Wi-Fi, recharge la page, puis confirme que le domaine est accessible. La reconnexion
Socket.IO est automatique et une resynchronisation REST récupère l’état courant.

### Spotify ne joue rien

Vérifie successivement : compte Premium, appareil actif, volume, autorisation Spotify, sélection de
l’appareil, puis « Tester la connexion ». Reconnecte Spotify si l’interface le demande.

### Le prochain morceau n’est pas celui attendu

Les priorités, votes, ancienneté, équité entre participants et artistes récents influencent le
choix. Un morceau déjà envoyé dans la file Spotify ne peut pas être retiré par l’API ; utilise
« Morceau suivant » si nécessaire.

### Le changement d’ambiance ne part pas

Contrôle le minimum de votes, le pourcentage, le temps de verrouillage et le verrou administrateur.
Un changement validé attend toujours la fin du morceau courant.

### Le serveur ne répond plus

Depuis le VPS, consulte `docker compose ps` puis `docker compose logs --tail=100 api`. Un
`docker compose restart api` conserve les données PostgreSQL et les navigateurs se reconnectent.

## Fin de soirée

1. Utiliser « Clôturer la soirée » et confirmer l’action.
2. Vérifier que les sessions invitées ont été coupées.
3. Mettre Spotify en pause si nécessaire.
4. Fermer la page de QR code.
5. Contrôler les logs et le health check.
6. Sauvegarder PostgreSQL si l’historique doit être conservé.

Une soirée clôturée ne peut pas être rouverte dans le MVP. Crée une nouvelle soirée pour le
prochain événement.
