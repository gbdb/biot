# Cycle de vie spécimen, scan double mode, warnings

Documentation des fonctionnalités implémentées : création de spécimen (porte-greffe, plantation), double mode scan RFID, stade phénologique, warnings sur l’accueil, compagnonnage sur la fiche spécimen.

---

## 2.2 Création spécimen

### Étape Porte-greffe (optionnelle)

- **Aucun cultivar** : l’étape Porte-greffe n’est pas affichée.
- **Cultivar sans CultivarPorteGreffe en base** : l’étape Porte-greffe n’est pas affichée.
- **Cultivar avec CultivarPorteGreffe disponibles** : une étape dédiée propose la liste des porte-greffes (API détail cultivar, champ `porte_greffes`) avec une option par défaut « Je ne sais pas / sans porte-greffe ». Le champ reste optionnel. Si l’utilisateur choisit un porte-greffe, une mention est ajoutée en préfixe des notes (ex. « Porte-greffe: M106 »).

### Modal plantation auto-proposé

Après succès du POST de création du spécimen :

- Si le **statut n’est pas « planifié »** : un modal propose « Enregistrer la plantation maintenant ? » avec :
  - **Oui, enregistrer** : ouverture du modal partagé AddEventModal avec type « plantation » et date du jour, puis redirection vers la fiche du spécimen créé.
  - **Plus tard** : redirection directe vers la fiche du spécimen.
- Si le statut est « planifié » : redirection directe sans proposition de plantation.

---

## 3 Double mode scan RFID

Avant tout scan, l’utilisateur choisit un mode (mémorisé pour la session) :

- **« Ouvrir la fiche »** : après lecture du tag, navigation vers la fiche du spécimen (comportement classique).
- **« Ajouter un événement »** : après lecture du tag, le modal AddEventModal s’ouvre avec le spécimen pré-rempli et verrouillé, focus sur le choix du type d’événement ; aucune navigation vers la fiche.

Un lien « Changer de mode » remet le choix à l’état initial (pas encore choisi) pour le prochain scan.

**Types d’événement en mode « événement rapide »** (icônes larges) : plantation, observation, taille, floraison, fructification, recolte, arrosage, maladie, traitement, amendement, autre (11 types, alignés sur `EVENT_TYPE_LABELS` côté mobile).

Tag inconnu : comportement inchangé (modal d’assignation : créer un spécimen ou assigner à un existant).

---

## 5 Compagnonnage

Section **« Compagnonnage »** sur la fiche spécimen (entre « Associé à (pollinisation) » et « Photos »).

### Deux sous-sections

- **« Ce spécimen bénéficie de »** : relations où l’espèce du spécimen est *cible* (organisme_cible) ; les espèces listées sont celles dont la présence aide ce spécimen. Affichage des compagnons **actifs** (présents dans le jardin, avec distance si GPS) et **manquants** (aucun spécimen de l’espèce dans le jardin ou dans le rayon).
- **« Ce spécimen aide »** : relations où l’espèce du spécimen est *source* (organisme_source) ; les espèces listées sont celles que ce spécimen aide. Même logique : actifs et manquants.

Le calcul des distances réutilise la logique **haversine** (`species/utils.py`, `distance_metres_between_specimens`). Les statuts sont : **ACTIF** (compagnon dans la distance optimale), **TROP_LOIN** (compagnon présent mais au-delà de la distance optimale), **MANQUANT** (aucun spécimen de l’espèce compagnon dans le jardin).

Si **aucune** `CompanionRelation` n’existe pour l’espèce du spécimen (ni en entrant ni en sortant), la section Compagnonnage n’est pas affichée. Une sous-section vide (aucun actif ni manquant) n’est pas affichée.

Si les coordonnées GPS du spécimen sont absentes : un libellé indique « Ajoutez les coordonnées GPS pour calculer les distances ».

---

## 7 Warnings (accueil)

Bloc **« Points d’attention »** sur l’accueil (jardin par défaut de l’utilisateur).

### Trois types de warnings

1. **Rappels en retard** : rappels dont la date est dépassée, pour les spécimens du jardin. Actions proposées : Marquer fait (appel à l’endpoint complete), Voir (fiche spécimen).
2. **Pollinisateurs manquants** : spécimens (avec cultivar) du jardin pour lesquels au moins un pollinisateur recommandé (CultivarPollinator) est absent du jardin. Lien « Voir les espèces compatibles » vers la bibliothèque.
3. **Alertes phénologiques** : stades (floraison, fructification, récolte) dont le début est imminent (calendrier espèce + 14 jours). Bouton « Confirmer » ouvre le modal d’événement avec le type pré-rempli.

Réponse API : **GET** `/api/gardens/<id>/warnings/` avec `overdue_reminders`, `missing_pollinators`, `phenology_alerts`, `total_count`.

- **Cache** : TTL 1 h (clé `warnings_{garden_id}`). Invalidation lors de : reminder_complete, création d’un spécimen, création d’un rappel (POST reminders), suppression d’un spécimen, PATCH spécimen **uniquement si le jardin change** (invalidation des deux jardins concernés).
- **Affichage** : au plus **5** warnings sur l’accueil, priorité : rappels en retard > pollinisateurs manquants > alertes phénologiques.
- **Dismiss** : en v1, dismissibilité en état local (masquage dans la session), non persistée.

Lien « Voir tous (N) » si `total_count > 5` (vers l’écran Rappels ou équivalent).

---

## 8.1 GPS

Les champs **latitude** et **longitude** existent sur le modèle Specimen. La logique **haversine** est centralisée dans `species/utils.py` (`distance_metres_between_specimens`) et réutilisée pour la pollinisation, le compagnonnage et toute autre fonctionnalité nécessitant une distance entre spécimens.

---

## 8.2 Phénologique (Option A implémentée)

- **Calcul automatique des alertes** : à partir du calendrier de l’espèce (OrganismCalendrier : floraison, fructification, récolte), une alerte est générée lorsque le **début** du stade (premier jour du mois de début) tombe dans les **14 prochains jours**. Si cette date est déjà passée dans l’année en cours, on considère l’année suivante.
- **Déjà confirmé** : si un événement du même type (floraison / fructification / récolte) existe pour le spécimen dans les **30 derniers jours**, l’alerte n’est pas générée.
- **Confirmation manuelle** : l’utilisateur peut enregistrer un événement (floraison, fructification, récolte) depuis la fiche spécimen (section Stade phénologique) ou depuis le bloc warnings de l’accueil (bouton Confirmer).

---

*Document mis à jour après implémentation du plan « Cycle de vie spécimen, scan double mode, warnings ».*
