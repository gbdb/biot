# Structure détaillée des applications — Jardin bIOT

Ce document décrit chaque application du projet avec une courte description et les modèles principaux.

---

## 1. jardinbiot (projet Django)

**Rôle** : Projet Django principal — configuration, routage, point d’entrée du backend.

- **Settings** (`jardinbiot/settings.py`) : `INSTALLED_APPS`, base de données **PostgreSQL** via `DATABASE_URL`, REST framework, JWT, CORS, `django.contrib.gis` pour PostGIS.
- **URLs** (`jardinbiot/urls.py`) : préfixe `/api/` → `species.api_urls`, auth (token, refresh, register), vues admin (Cesium, météo, géocodage, gestion des données).
- **WSGI** : point d’entrée pour le déploiement.

---

## 2. catalog — Catalogue (espèces, semences, amendements)

**Rôle** : Base de connaissances sur les espèces et les ressources (semences, amendements, compagnonnage, tags). Données stables, multi-sources, partagées entre jardins.

### Modèles principaux

| Modèle | Description |
|--------|-------------|
| **Organism** | Espèce botanique : nom commun/latin, famille, genre, type (arbre fruitier, vivace, etc.), besoins eau/soleil, zones de rusticité (JSON), sol, comestible, pollinisation, fixateur azote, mellifère, etc. Recherche full-text (PostgreSQL). |
| **OrganismNom** | Noms alternatifs (multilingue, par source). |
| **OrganismPropriete**, **OrganismUsage**, **OrganismCalendrier** | Propriétés sol, usages, calendrier (périodes). |
| **UserTag**, **OrganismUserTag** | Tags utilisateur sur les espèces. |
| **CompanionRelation** | Compagnonnage : espèce source → espèce cible, distance optimale (m). |
| **Cultivar** | Variété (liée à un Organism) : nom, description, couleur fruit, etc. |
| **CultivarPollinator**, **CultivarPorteGreffe** | Pollinisateurs et porte-greffes par cultivar. |
| **SeedSupplier** | Fournisseurs de semences. |
| **SeedCollection** | Lots de semences (liés à un organisme, fournisseur, etc.). |
| **SemisBatch** | Session de semis — lie un lot de semences aux spécimens créés. |
| **Amendment** | Amendements (compost, engrais, etc.). |
| **OrganismAmendment** | Lien organisme ↔ amendement recommandé. |
| **BaseEnrichmentStats** | Statistiques d’enrichissement des fiches. |

### Signal

- `catalog.signals` : post_save sur Organism pour mise à jour du `search_vector` (recherche full-text).

---

## 3. gardens — Jardins et météo

**Rôle** : Gestion des lieux (jardins), météo, arrosage, zones géographiques (Zone), préférences utilisateur.

### Modèles principaux

| Modèle | Description |
|--------|-------------|
| **Garden** | Jardin : nom, adresse, ville, coordonnées, timezone. Seuils d’alertes (gel, pluie, sécheresse, canicule), zone de rusticité USDA. Champs terrain 3D : boundary (GeoJSON), contours_geojson, terrain_stats, surface_ha. |
| **Zone** | Zone au sein d’un jardin : nom, type (stationnement, culture, boisé, eau, autre), boundary (polygone PostGIS, SRID 4326), surface_m2 (calculée en save via projection Québec EPSG:32198), couleur, ordre. |
| **GardenGCP** | Points de contrôle au sol (GCP) pour calibration drone / OpenDroneMap. |
| **WeatherRecord** | Météo quotidienne par jardin : températures, pluie, neige, ET0. |
| **SprinklerZone** | Zone d’arrosage : webhook, MQTT, Home Assistant, etc. ; option « annuler si pluie prévue ». |
| **UserPreference** | Préférences utilisateur : jardin par défaut, distance de pollinisation par défaut. |

### Signals

- `gardens.signals` : connectés au `ready()` de l’app (ex. logique liée aux jardins).

---

## 4. species — Spécimens et suivi terrain

**Rôle** : Suivi des individus (spécimens) dans le jardin : localisation, statut, événements, rappels, photos, groupes de pollinisation, favoris. Contient aussi l’API REST principale et une grande partie de l’admin Django.

### Modèles principaux

| Modèle | Description |
|--------|-------------|
| **Specimen** | Plant/arbre individuel : jardin, organisme, cultivar, nom, zone (FK vers Zone), zone_jardin (libellé libre), GPS, date/âge de plantation, source, statut, santé, hauteur, notes, tag NFC, photo principale. |
| **SpecimenFavorite**, **OrganismFavorite** | Favoris utilisateur (spécimens et espèces). |
| **SpecimenGroup**, **SpecimenGroupMember** | Groupes de pollinisation (rôles : pollinisateur, principal, partenaire). |
| **Event** | Événement (plantation, arrosage, taille, récolte, observation, etc.) ; lien amendement, photos. |
| **Reminder** | Rappel (type, date, alerte, récurrence). |
| **Photo** | Photo liée à un spécimen ou à un événement. |
| **DataImportRun** | Suivi des imports de données (source, statut). |

### API (species.api_views, species.api_urls)

- **Specimens** : CRUD, by-NFC, favoris, duplicate, events, reminders, photos, companions, zones (liste des zone_jardin), nearby (GPS).
- **Specimen groups** : CRUD, members.
- **Organisms**, **Cultivars** : CRUD, listes, recherche.
- **Gardens** : liste, détail, création, phenology-alerts, warnings.
- **Zones** : CRUD avec filtre `?garden_id=` ; boundary en GeoJSON, surface_m2 en lecture seule.
- **GCP** : CRUD par jardin, export CSV.
- **Auth** : token JWT, refresh, register, me, preferences, change-password.
- **Admin / utilitaires** : users, run-command, species-stats, import VASCAN, expected-events, reminders/upcoming, weather-alerts.

### Autres modules species

- **Serializers** : dans `species/serializers.py` (organismes, jardins, zones, spécimens, événements, rappels, photos, groupes).
- **Admin** : dans `species/admin.py` (Organism, Cultivar, Garden, Zone, Specimen, Event, Reminder, Photo, etc.).
- **Vues web** : dashboard météo, Cesium terrain, géocodage jardin, companion network, gestion des données.
- **Logique métier** : compagnonnage (`companion.py`), alertes météo (`weather_service.py`), phénologie, warnings.

---

## 5. specimens — Placeholder (non installée)

**Rôle** : Ancienne app « spécimens » ; les modèles ont été déplacés dans **species**. L’app existe encore (dossier, `apps.py` : « Spécimens et journal ») mais n’est **pas** dans `INSTALLED_APPS`. `models.py` ne fait que référencer les migrations. À considérer comme historique ou future cible de refactorisation.

---

## 6. mobile — App mobile (Expo / React Native)

**Rôle** : Frontend mobile pour consulter et gérer jardins, espèces et spécimens (Expo, React Native, expo-router).

- **Spécimens** : liste, détail, création, édition, scan NFC, à proximité (GPS), dupliquer, favoris.
- **Espèces** : bibliothèque, fiche espèce, spécimens par espèce.
- **Jardins** : choix du jardin, spécimens par jardin.
- **Événements et rappels** : création, détail, « appliquer à la zone ».
- **Photos** : upload, galerie, photo par défaut.
- **Rappels à venir** : liste globale.
- **Auth** : JWT, stockage sécurisé.

---

## Récapitulatif

| App / module | Rôle en une phrase |
|--------------|--------------------|
| **jardinbiot** | Projet Django : configuration, URLs, admin. |
| **catalog** | Catalogue espèces, cultivars, semences, amendements, compagnonnage, tags. |
| **gardens** | Jardins, zones (PostGIS), météo, GCP, arrosage, préférences utilisateur. |
| **species** | Spécimens, événements, rappels, photos, groupes de pollinisation, API REST et admin. |
| **specimens** | Placeholder (non utilisée ; modèles dans species). |
| **mobile** | App mobile Expo pour jardins, espèces et spécimens. |

---

*Dernière mise à jour : mars 2026 — après ajout du modèle Zone (gardens) et de la FK Specimen.zone.*
