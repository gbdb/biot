# Fiches spécimens et outils de suivi

Ce document décrit en détail tout ce qui entoure l’aspect **spécimen** dans Jardin Biot : modèles (tables), tags NFC, vues mobiles, relations au jardin, événements, photos, GPS, rappels et groupes de pollinisation.

---

## 1. Vue d’ensemble

Un **spécimen** est un plant ou arbre individuel sur le terrain (ex. « Mon Pommier Dolgo #1 près du ruisseau »). Il est lié à une **espèce** (organisme) et optionnellement à un **cultivar**, à un **jardin** et à une **zone** dans ce jardin. On peut lui associer des **événements** (plantation, arrosage, taille, récolte, etc.), des **rappels**, des **photos** et un **tag NFC** pour l’identifier rapidement sur le terrain. Les spécimens avec coordonnées GPS peuvent être listés « à proximité » depuis l’app mobile.

---

## 2. Tables et modèles (backend)

Les modèles spécimens, événements, rappels et photos vivent dans l’app **species** (Django). L’app **specimens** existe mais ne contient plus les modèles (migration vers catalog/gardens pour d’autres entités).

### 2.1 Specimen (`species.Specimen`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | PK | Identifiant |
| `garden` | FK → gardens.Garden, null | Jardin où se trouve le spécimen |
| `organisme` | FK → catalog.Organism | Espèce (ex. Malus pumila) |
| `cultivar` | FK → catalog.Cultivar, null | Variété/cultivar si connu (ex. Dolgo) |
| `nom` | CharField(200) | Nom personnel (ex. Pommier Dolgo #1) |
| `code_identification` | CharField(50), unique, null | Code unique manuel (ex. PMMDOL-001) |
| `nfc_tag_uid` | CharField(100), unique, null, db_index | UID du tag NFC/RFID — scan → ouvre la fiche |
| `zone_jardin` | CharField(100) | Ex. Zone Nord, Près du ruisseau |
| `latitude` | Float, null | Coordonnée GPS |
| `longitude` | Float, null | Coordonnée GPS |
| `date_plantation` | Date, null | Date de plantation |
| `age_plantation` | Integer, null | Âge du plant à la plantation (années) |
| `source` | CharField(20), choices | pepiniere, semis, bouture, division, greffe, marcottage, echange, sauvage, autre |
| `pepiniere_fournisseur` | CharField(200) | Nom pépinière ou fournisseur |
| `seed_collection` | FK → catalog.SeedCollection, null | Lot de semences (si source = semis) |
| `statut` | CharField(20), default='planifie' | planifie, commande, transplanter, jeune, etabli, mature, declin, mort, enleve |
| `sante` | Integer, default=5 | État de santé (1 = très malade, 10 = excellent) |
| `hauteur_actuelle` | Float, null | Hauteur en mètres |
| `premiere_fructification` | Integer, null | Année première fructification |
| `notes` | TextField | Observations, particularités |
| `photo_principale` | FK → species.Photo, null | Photo affichée par défaut (listes, accueil) |
| `date_ajout` | DateTimeField, auto_now_add | |
| `date_modification` | DateTimeField, auto_now | |

**Méthode** : `age_annees()` — âge approximatif à partir de `date_plantation` et `age_plantation`.

**Relations** :
- `specimens` depuis `Garden` (related_name)
- `specimens` depuis `Organism`, `Cultivar`
- `evenements` (Event), `rappels` (Reminder), `photos` (Photo)
- `favorited_by` (SpecimenFavorite)
- `pollination_groups` (SpecimenGroupMember)

---

### 2.2 SpecimenFavorite (`species.SpecimenFavorite`)

Favoris utilisateur pour les spécimens.

| Champ | Type | Description |
|-------|------|-------------|
| `user` | FK → AUTH_USER_MODEL | Utilisateur |
| `specimen` | FK → species.Specimen | Spécimen favori |

**Contrainte** : `unique_together = [['user', 'specimen']]`.

---

### 2.3 SpecimenGroup et SpecimenGroupMember (pollinisation)

- **SpecimenGroup** : groupe de spécimens liés pour la pollinisation.
  - `type_groupe` : `male_female` (1 pollinisateur + jusqu’à 6 principaux) ou `cross_pollination_cultivar` (au moins 2 partenaires).
  - `organisme` : FK optionnel vers l’espèce commune (pour cross_pollination).
- **SpecimenGroupMember** : lien groupe ↔ spécimen avec `role` : `pollinisateur`, `principal`, `partenaire`.

Règles : un seul pollinisateur et au plus 6 principaux pour `male_female` ; au moins 2 membres pour `cross_pollination_cultivar`. Détails dans [pollinisation-cultivars-groupes-specimens.md](./pollinisation-cultivars-groupes-specimens.md).

---

### 2.4 Event (`species.Event`)

Événement dans la vie d’un spécimen (plantation, arrosage, taille, observation, récolte, etc.).

| Champ | Type | Description |
|-------|------|-------------|
| `specimen` | FK → species.Specimen | Spécimen concerné |
| `type_event` | CharField(20), choices | plantation, arrosage, fertilisation, amendement, taille, paillage, observation, floraison, fructification, recolte, maladie, traitement, transplantation, protection, autre, mort, enlever |
| `date` | DateField | Date de l’événement |
| `heure` | TimeField, null | Heure optionnelle |
| `titre` | CharField(200) | Titre court optionnel |
| `description` | TextField | Description détaillée |
| `quantite` | Float, null | Quantité (L, kg, etc.) |
| `unite` | CharField(50) | Unité (L, kg, heures, cm…) |
| `amendment` | FK → catalog.Amendment, null | Amendement utilisé |
| `produit_utilise` | CharField(200) | Autre produit/outil |
| `temperature` | Float, null | °C |
| `conditions_meteo` | CharField(100) | Ex. Ensoleillé, Pluvieux |
| `date_ajout` | DateTimeField, auto_now_add | |

---

### 2.5 Reminder (`species.Reminder`)

Rappel lié à un spécimen (créable depuis l’ajout d’événement ou directement).

| Champ | Type | Description |
|-------|------|-------------|
| `specimen` | FK → species.Specimen | Spécimen concerné |
| `type_rappel` | CharField(20) | arrosage, suivi_maladie, taille, suivi_general, cueillette |
| `date_rappel` | DateField | Date du rappel |
| `type_alerte` | CharField(10), default='popup' | email, popup, son |
| `titre` | CharField(200) | Titre optionnel |
| `description` | TextField | Description optionnelle |
| `recurrence_rule` | CharField(20), default='none' | none, biweekly, annual, biannual |
| `date_ajout` | DateTimeField, auto_now_add | |

---

### 2.6 Photo (`species.Photo`)

Photo d’un **organisme** (espèce) ou d’un **spécimen**, optionnellement liée à un **événement**.

| Champ | Type | Description |
|-------|------|-------------|
| `organisme` | FK → catalog.Organism, null | Photo générique espèce |
| `specimen` | FK → species.Specimen, null | Photo de ce spécimen |
| `event` | FK → species.Event, null | Photo liée à un événement |
| `image` | ImageField, upload_to='photos/%Y/%m/' | Fichier image |
| `type_photo` | CharField(35), choices | Type pour galerie (tronc, feuillage, reproduction, avant/après, autre, etc.) — voir liste complète dans le modèle |
| `titre` | CharField(200) | |
| `description` | TextField | |
| `date_prise` | Date, null | Date de prise |
| `source_url`, `source_author`, `source_license` | URL/CharField | Attribution (ex. Wikimedia) |
| `date_ajout` | DateTimeField, auto_now_add | |

**Types de photo (galerie)** : tronc_juvenile, tronc_mature, tronc_malade, tronc_ecorce, feuillage_printemps/ete/automne/jeune/sain/malade, branches_*, reproduction_fleurs/fruits_immature/fruits_mur/graines, racines, port_general, problemes, avant, apres, autre.

---

## 3. Relation au jardin

- **Specimen.garden** : FK optionnelle vers `gardens.Garden`. Un spécimen peut être assigné à un jardin (nom, adresse, ville, coordonnées, météo, zones d’arrosage, etc.).
- **Filtrage API** : la liste des spécimens accepte `?garden=<id>` pour ne retourner que les spécimens de ce jardin.
- **Préférence utilisateur** : `UserPreference.default_garden` sert de jardin par défaut (ex. pour la liste des spécimens et la création). La liste mobile peut utiliser ce jardin par défaut pour charger les spécimens.
- **Zone jardin** : `Specimen.zone_jardin` est un libellé libre (ex. « Zone Nord »). Utilisé pour :
  - filtrer les spécimens (`?zone=...`) ;
  - **appliquer un événement à la zone** : depuis un événement d’un spécimen, on peut dupliquer cet événement sur tous les autres spécimens du même jardin ayant la même `zone_jardin`.

---

## 4. Tags (identification terrain)

Dans le contexte **spécimen**, les « tags » désignent les **tags NFC/RFID** (identification physique). Les **UserTag** du catalogue (étiquettes utilisateur sur les espèces) concernent les organismes, pas les spécimens.

- **Champ** : `Specimen.nfc_tag_uid` — UID du tag NFC/RFID (ex. 04A1B2C3D4E5F6). Unique, indexé.
- **Résolution** : `GET /api/specimens/by-nfc/<uid>/` — cherche d’abord `nfc_tag_uid`, puis en fallback `code_identification`. Retourne le détail du spécimen ou 404.
- **App mobile** :
  - **Scan** (`/scan`) : scanne un tag ; si un spécimen est associé → ouverture de sa fiche (avec préchargement possible via `setNfcPreloadedSpecimen`) ; sinon → modal pour assigner le tag à un spécimen existant (`updateSpecimen(..., { nfc_tag_uid: uid })`).
  - **Création / édition spécimen** : champ « Tag NFC » avec saisie manuelle ou bouton « Scanner » (NfcScanModal) pour remplir `nfc_tag_uid`.
- **Rétrocompat** : l’API accepte aussi un `code_identification` pour la résolution NFC si aucun `nfc_tag_uid` ne correspond.

---

## 5. GPS et spécimens à proximité

- **Champs** : `Specimen.latitude`, `Specimen.longitude` (Float, null).
- **Création (mobile)** : écran création spécimen — bouton « Capturer ma position » (expo-location) pour remplir lat/lng à la création.
- **Édition (mobile)** : écran édition — affichage des coordonnées + bouton « Revalider les coordonnées GPS » qui met à jour avec la position actuelle.
- **API nearby** : `GET /api/specimens/nearby/?lat=...&lng=...&radius=...&limit=...`  
  - Paramètres : `lat`, `lng` (requis), `radius` (mètres, défaut 1000), `limit` (défaut 50).  
  - Retourne les spécimens ayant des coordonnées, dans le rayon, triés par distance ; chaque item inclut `distance_km`.
- **Vue mobile** : **Spécimens à proximité** (`/specimens/nearby`) — demande la localisation, appelle `getSpecimensNearby`, affiche la liste avec distance (m ou km). Rafraîchissement par pull-to-refresh.

---

## 6. Événements (journal de suivi)

### 6.1 API

- `GET /api/specimens/<id>/events/` — liste des événements du spécimen (ordre date/heure décroissant, limit 50).
- `POST /api/specimens/<id>/events/` — créer un événement (body : type_event, date, heure, titre, description, etc.).
- `GET /api/specimens/<id>/events/<event_pk>/` — détail.
- `PATCH /api/specimens/<id>/events/<event_pk>/` — modifier.
- `DELETE /api/specimens/<id>/events/<event_pk>/` — supprimer.
- `GET /api/specimens/<id>/events/<event_pk>/apply-to-zone-preview/` — nombre de spécimens dans la même zone (même garden + zone_jardin).
- `POST /api/specimens/<id>/events/<event_pk>/apply-to-zone/` — dupliquer cet événement sur tous les autres spécimens de la même zone.
- `GET/POST /api/specimens/<id>/events/<event_pk>/photos/` — photos de l’événement.

### 6.2 App mobile (fiche spécimen)

- **Liste** : section « Événements récents » — liste (ou vue miniatures avec première photo). Clic → modal détail événement.
- **Ajout** : FAB « Ajouter un événement » → modal avec onglets **Événement** / **Rappel**.
  - Événement : choix du type (observation, arrosage, plantation, récolte, taille, floraison, fructification, etc.), titre/description optionnels, date du jour par défaut. Option « Mort et enlèvement » (type mort → mise à jour statut spécimen, puis proposition enlèvement ou rappel).
  - Après création d’un événement, possibilité d’ajouter des photos à cet événement (avant/après/autre).
- **Détail événement** : affichage type, date, titre, description ; liste des photos ; pour certains types (ex. taille, transplantation), bouton « Appliquer à la zone » si la zone est définie (prévisualisation du nombre de spécimens concernés).
- **Événements récents globaux** : `GET /api/specimens/recent_events/?limit=20` — utilisable pour l’accueil (derniers événements tous spécimens, avec specimen et photo).

---

## 7. Rappels (reminders)

### 7.1 API

- `GET /api/specimens/<id>/reminders/` — liste des rappels du spécimen.
- `POST /api/specimens/<id>/reminders/` — créer un rappel (type_rappel, date_rappel, type_alerte, titre, description, recurrence_rule).
- `GET/PATCH/DELETE /api/specimens/<id>/reminders/<reminder_pk>/` — détail / modification / suppression.
- `POST /api/specimens/<id>/reminders/<reminder_pk>/complete/` — marquer comme complété : crée un événement (type mappé depuis le type_rappel : arrosage→arrosage, suivi_maladie→maladie, taille→taille, suivi_general→observation, cueillette→recolte), optionnellement crée le prochain rappel si récurrent (biweekly, annual, biannual), puis supprime le rappel.

### 7.2 App mobile

- **Fiche spécimen** : section « Rappels » — liste des rappels (type, date, alerte). Clic → ReminderActionModal (détail, compléter, etc.). Long press → suppression.
- **Rappels à venir (global)** : endpoint dédié `GET /api/reminders/upcoming/` pour la page Rappels (liste des rappels à venir, tous spécimens).

---

## 8. Photos

### 8.1 API

- `GET /api/specimens/<id>/photos/` — toutes les photos du spécimen (y compris liées à des événements).
- `POST /api/specimens/<id>/photos/` — upload d’une photo (multipart : image, type_photo, titre, description, date_prise). Lie la photo au spécimen.
- `DELETE /api/specimens/<id>/photos/<photo_pk>/` — supprimer une photo.
- `POST /api/specimens/<id>/photos/<photo_pk>/set-default/` — définir cette photo comme `photo_principale` du spécimen.
- Pour un événement : `GET/POST /api/specimens/<id>/events/<event_pk>/photos/` — liste / upload de photos liées à l’événement.

### 8.2 App mobile (fiche spécimen)

- **Galerie** : carousel des photos du spécimen (PhotoCarousel). Badge événement si la photo est liée à un événement ; clic sur badge → ouverture du détail de l’événement.
- **En plein écran** : pour les photos du spécimen (sans événement), actions « Définir par défaut » et « Supprimer ».
- **Ajout** : bouton « Ajouter une photo » → choix appareil / galerie → option « Photo seule » (upload directe sur le spécimen) ou « Créer un événement » (création événement puis upload liée à cet événement).
- **Photos d’un événement** : dans le modal détail événement, liste des photos + « + Photo » (tag avant/après/autre, appareil ou galerie).

---

## 9. Favoris

- **SpecimenFavorite** : table (user, specimen). Un utilisateur peut marquer des spécimens en favoris.
- **API** : `POST /api/specimens/<id>/favoris/` — ajouter ; `DELETE /api/specimens/<id>/favoris/` — retirer.
- **Liste** : paramètre `?favoris=true` pour ne retourner que les spécimens favoris de l’utilisateur connecté.
- **Mobile** : étoile sur chaque carte (liste et détail) pour ajouter/retirer ; onglet/filtre « Favoris » dans la liste des spécimens.

---

## 10. Duplication de spécimen

- **API** : `POST /api/specimens/<id>/duplicate/` — crée une copie avec les mêmes données (organisme, jardin, zone, GPS, date plantation, source, statut, santé, hauteur, première fructification, notes). Le nom est suffixé « (copie) » ; code_identification et nfc_tag_uid ne sont pas copiés.
- **Mobile** : bouton « Dupliquer ce spécimen » en bas de la fiche → redirection vers la fiche du nouveau spécimen.

---

## 11. Endpoints API spécimens (résumé)

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/specimens/by-nfc/<uid>/` | Résolution NFC → spécimen |
| GET | `/api/specimens/` | Liste (filtres: garden, zone, statut, organisme, search, favoris, sante, include_enleve) |
| GET | `/api/specimens/count/?...` | Nombre avec les mêmes filtres |
| GET | `/api/specimens/zones/` | Liste des zone_jardin distinctes |
| GET | `/api/specimens/nearby/?lat=&lng=&radius=&limit=` | Spécimens à proximité GPS |
| GET | `/api/specimens/recent_events/?limit=` | Derniers événements (tous spécimens) |
| GET/POST | `/api/specimens/<id>/` | Détail / création (POST) |
| PATCH/DELETE | `/api/specimens/<id>/` | Mise à jour / suppression |
| POST | `/api/specimens/<id>/duplicate/` | Dupliquer |
| POST/DELETE | `/api/specimens/<id>/favoris/` | Ajouter / retirer favori |
| GET/POST | `/api/specimens/<id>/events/` | Liste / créer événements |
| GET/PATCH/DELETE | `/api/specimens/<id>/events/<event_pk>/` | Détail / modifier / supprimer événement |
| GET/POST | `.../events/<event_pk>/apply-to-zone-preview/` | Nombre de spécimens dans la zone |
| POST | `.../events/<event_pk>/apply-to-zone/` | Appliquer l’événement à la zone |
| GET/POST | `.../events/<event_pk>/photos/` | Photos de l’événement |
| GET/POST | `/api/specimens/<id>/photos/` | Liste / upload photos spécimen |
| DELETE | `.../photos/<photo_pk>/` | Supprimer photo |
| POST | `.../photos/<photo_pk>/set-default/` | Définir photo par défaut |
| GET/POST | `/api/specimens/<id>/reminders/` | Liste / créer rappels |
| GET/PATCH/DELETE | `.../reminders/<reminder_pk>/` | Détail / modifier / supprimer rappel |
| POST | `.../reminders/<reminder_pk>/complete/` | Compléter (créer événement + optionnel prochain rappel) |

---

## 12. Vues (pages) mobiles liées aux spécimens

| Route | Fichier | Description |
|-------|---------|-------------|
| **Onglet Spécimens** | `(tabs)/specimens.tsx` | Liste des spécimens : filtres (Tous, Favoris, Zone, Spécial : santé/statut), compteur, option « Inclure les enlevés », mode liste / grille (miniatures). Clic → fiche spécimen. |
| **Fiche spécimen** | `specimen/[id].tsx` | Détail : nom, espèce, lien vers fiche espèce, statut, infos (jardin, zone, date plantation, GPS, notes), associations pollinisation (avec distance et alerte « Zone trop loin »), photos (carousel + ajout + défaut/suppression), rappels, événements récents (liste ou miniatures), FAB « Ajouter un événement », bouton Dupliquer, édition/favori en en-tête. |
| **Création spécimen** | `specimen/create.tsx` | Formulaire : espèce* (picker avec recherche), cultivar optionnel, nom*, jardin, zone, position GPS (capture position), tag NFC (saisie + scan), statut, notes. Paramètres de route optionnels : `nfc_tag_uid`, `organisme`, `garden`. |
| **Édition spécimen** | `specimen/edit/[id].tsx` | Même champs que création (espèce, cultivar, nom, jardin, zone, tag NFC, statut, notes) + affichage GPS et bouton « Revalider les coordonnées GPS ». |
| **Spécimens à proximité** | `specimens/nearby.tsx` | Demande localisation, appelle `getSpecimensNearby`, liste avec photo, nom, espèce, distance (m/km). Pull-to-refresh. Clic → fiche spécimen. |
| **Scan NFC** | `scan.tsx` | Scan d’un tag : si associé à un spécimen → ouverture fiche (préchargement possible) ; sinon → modal pour assigner le tag à un spécimen. |

**Layout** : `specimens/_layout.tsx` — Stack avec écran `nearby` (titre « Spécimens à proximité »).

**Composants réutilisables** : SpecimenFilterBar, ZonePickerModal, SpecialPickerModal, NfcScanModal, PhotoCarousel, ReminderActionModal, FAB.

---

## 13. Types et libellés (mobile, `types/api.ts`)

- **SpecimenStatut** : planifie, commande, transplanter, jeune, etabli, mature, declin, mort, enleve — avec `SPECIMEN_STATUT_LABELS`.
- **SpecimenList** : id, nom, code_identification, nfc_tag_uid, organisme, organisme_nom, garden, garden_nom, zone_jardin, statut, sante, date_plantation, latitude, longitude, is_favori, photo_principale_url, distance_km (pour nearby).
- **SpecimenDetail** : champs détail + organisme (minimal), cultivar, garden (minimal), is_favori, photo_principale_url, pollination_associations.
- **PollinationAssociation** : group_id, type_groupe, role, other_members (specimen_id, nom, organisme_nom, cultivar_nom, role, statut, distance_metres, alerte_distance).
- **SpecimenCreateUpdate** : champs éditables pour création/mise à jour.
- **EventType** et **EVENT_TYPE_LABELS**, **ReminderType**, **ReminderAlerteType**, **ReminderRecurrenceRule** et leurs libellés pour les modals événement/rappel.

---

## 14. Groupes de pollinisation (rappel)

- **SpecimenGroup** : type_groupe (male_female | cross_pollination_cultivar), organisme optionnel.
- **SpecimenGroupMember** : group, specimen, role (pollinisateur | principal | partenaire).
- **API** : `GET/POST /api/specimen-groups/`, `GET/PATCH/DELETE /api/specimen-groups/<id>/`, `POST /api/specimen-groups/<id>/members/`, `DELETE .../members/<member_pk>/`.
- **Détail spécimen** : `pollination_associations` calculées côté backend (distance haversine entre paires, seuil de distance configurable par espèce / préférence utilisateur / réglage global). Alerte « Zone trop loin » si distance > seuil.
- Voir [pollinisation-cultivars-groupes-specimens.md](./pollinisation-cultivars-groupes-specimens.md) pour les règles métier et la priorité des seuils.

---

## 15. Fichiers principaux (référence)

- **Backend** : `species/models.py` (Specimen, SpecimenFavorite, SpecimenGroup, SpecimenGroupMember, Event, Reminder, Photo), `species/api_views.py` (SpecimenViewSet, SpecimenByNfcView), `species/serializers.py`, `species/api_urls.py`, `gardens/models.py` (Garden, UserPreference).
- **Mobile** : `mobile/app/(tabs)/specimens.tsx`, `mobile/app/specimen/[id].tsx`, `mobile/app/specimen/create.tsx`, `mobile/app/specimen/edit/[id].tsx`, `mobile/app/specimens/nearby.tsx`, `mobile/app/scan.tsx`, `mobile/app/specimens/_layout.tsx`, `mobile/api/client.ts`, `mobile/types/api.ts`, `mobile/components/SpecimenFilterBar.tsx`, `mobile/components/ZonePickerModal.tsx`, `mobile/components/SpecialPickerModal.tsx`, `mobile/components/NfcScanModal.tsx`, `mobile/components/PhotoCarousel.tsx`, `mobile/components/ReminderActionModal.tsx`.

Ce document couvre l’ensemble des tables, relations, API, vues mobiles et comportements autour des fiches spécimens et des outils de suivi (événements, rappels, photos, GPS, NFC, jardin, pollinisation).
