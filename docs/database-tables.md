# Structure de la base de données — JardinBiot

Ce document décrit les tables et la structure des données du projet. Les modèles Django sont répartis dans les apps **gardens**, **catalog** et **species**. Les noms de tables en base peuvent différer du nom du modèle (attribut `db_table` dans `Meta`).

---

## Vue d’ensemble des apps

| App       | Rôle principal                                                                 |
|----------|-----------------------------------------------------------------------------------|
| **gardens** | Jardins, zones, météo, arrosage (sprinklers), préférences utilisateur, partenaires |
| **catalog** | Catalogue : espèces (Organism), cultivars, compagnonnage, semences, amendements, tags |
| **species** | Spécimens (plants sur le terrain), événements, rappels, photos, groupes de pollinisation, imports |

Les tables Django standards (auth_user, auth_group, django_session, etc.) ne sont pas détaillées ici.

---

## 1. App **gardens**

### 1.1 `species_garden` — Garden

Jardin avec adresse pour météo et automatisation (vue 3D Cesium optionnelle).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom | CharField(200) | Nom du jardin |
| adresse | CharField(400) | Adresse complète |
| ville | CharField(100) | |
| code_postal | CharField(20) | |
| pays | CharField(100) | Défaut : Canada |
| latitude | FloatField | Pour météo (Open-Meteo) |
| longitude | FloatField | |
| timezone | CharField(50) | Ex. America/Montreal |
| seuil_temp_chaud_c | FloatField | Défaut 25.0 |
| seuil_pluie_faible_mm | FloatField | Défaut 5.0 |
| jours_periode_analyse | IntegerField | Défaut 5 (alerte sécheresse) |
| jours_sans_pluie_prevision | IntegerField | Défaut 3 |
| seuil_gel_c | FloatField | Défaut -2.0 |
| seuil_temp_elevee_c | FloatField | Optionnel (canicule) |
| seuil_pluie_forte_mm | FloatField | Défaut 15.0 |
| zone_rusticite | CharField(10) | Ex. 4a |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |
| boundary | JSONField | GeoJSON Polygon (limites propriété) |
| contours_geojson | JSONField | Courbes de niveau (FeatureCollection) |
| terrain_stats | JSONField | altitude_min/max, pente_moyenne, surface_ha, etc. |
| surface_ha | FloatField | Optionnel |
| distance_unit | CharField(2) | 'm' (mètres) ou 'ft' (pieds), défaut 'm' |

---

### 1.2 `gardens_gardengcp` — GardenGCP

Point de contrôle au sol (GCP) pour calibration drone / OpenDroneMap.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| garden_id | FK → species_garden | CASCADE |
| label | CharField(50) | Ex. GCP-01 |
| latitude | FloatField | |
| longitude | FloatField | |
| photo | ImageField | upload_to='garden_gcps/' |
| date_capture | DateField | Optionnel |
| notes | TextField | |

---

### 1.3 `species_weatherrecord` — WeatherRecord

Météo quotidienne par jardin.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| garden_id | FK → species_garden | CASCADE |
| date | DateField | Index, unique_together avec garden |
| temp_max | FloatField | |
| temp_min | FloatField | |
| temp_mean | FloatField | |
| precipitation_mm | FloatField | Défaut 0.0 |
| rain_mm | FloatField | |
| snowfall_cm | FloatField | |
| et0_mm | FloatField | |
| date_creation | DateTimeField | auto_now_add |

**Contrainte :** `unique_together = ['garden', 'date']`

---

### 1.4 `species_sprinklerzone` — SprinklerZone

Zone d’arrosage pour automatisation (webhook, MQTT, Home Assistant, etc.).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| garden_id | FK → species_garden | CASCADE |
| nom | CharField(100) | Ex. Zone potager |
| type_integration | CharField(30) | webhook, mqtt, home_assistant, ifttt, autre |
| webhook_url | URLField | POST pour déclencher |
| config | JSONField | Topic MQTT, entity_id HA, etc. |
| actif | BooleanField | Défaut True |
| annuler_si_pluie_prevue | BooleanField | Défaut True |
| duree_defaut_minutes | IntegerField | Défaut 15 |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |

---

### 1.5 `species_userpreference` — UserPreference

Préférences utilisateur (jardin par défaut, distance de pollinisation).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| user_id | OneToOne → auth_user | CASCADE |
| default_garden_id | FK → species_garden | SET_NULL, optionnel |
| pollination_distance_max_default_m | FloatField | Optionnel |

---

### 1.6 `gardens_zone` — Zone

Zone au sein d’un jardin (polygone GeoJSON, type, surface en m² calculée).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| garden_id | FK → species_garden | CASCADE |
| nom | CharField(100) | |
| type | CharField(20) | stationnement, culture, boise, eau, autre |
| boundary | JSONField | GeoJSON Polygon (WGS84) |
| surface_m2 | FloatField | Calculé depuis boundary (shapely + pyproj EPSG:32198) |
| couleur | CharField(7) | Défaut #3d5c2e |
| ordre | IntegerField | Défaut 0 |
| date_creation | DateTimeField | auto_now_add |

---

### 1.7 `gardens_partner` — Partner

Partenaire / fournisseur / lien catalogue (affichage, liens externes).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom | CharField(200) | |
| url | URLField | |
| ordre | IntegerField | Ordre d’affichage |
| actif | BooleanField | Défaut True |
| notes | TextField | |

---

## 2. App **catalog**

### 2.1 `species_espece` — Organism

Espèce botanique (une ligne par espèce). Données multi-sources.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom_commun | CharField(200) | Index |
| nom_latin | CharField(200) | Index |
| slug_latin | SlugField(220) | Unique, dérivé du nom latin |
| tsn | PositiveIntegerField | Taxonomic Serial Number (ITIS/USDA), unique |
| vascan_id | PositiveIntegerField | VASCAN, unique |
| famille | CharField(100) | Famille botanique |
| genus | CharField(80) | Genre |
| regne | CharField(20) | plante, champignon, mousse |
| type_organisme | CharField(30) | arbre_fruitier, vivace, legume, etc. |
| besoin_eau | CharField(15) | tres_faible → tres_eleve |
| besoin_soleil | CharField(20) | ombre_complete → plein_soleil |
| zone_rusticite | JSONField | Liste de zones avec source |
| sol_textures | JSONField | Liste textures |
| sol_ph | JSONField | pH acceptés |
| sol_drainage | CharField(20) | Optionnel |
| sol_richesse | CharField(20) | pauvre, moyen, riche |
| hauteur_max | FloatField | mètres |
| largeur_max | FloatField | mètres |
| vitesse_croissance | CharField(20) | Optionnel |
| comestible | BooleanField | Défaut True |
| parties_comestibles | TextField | |
| toxicite | TextField | |
| type_noix | CharField(20) | Optionnel (noyer, noisettier, etc.) |
| age_fructification | IntegerField | Années |
| periode_recolte | CharField(100) | |
| pollinisation | TextField | |
| distance_pollinisation_max | FloatField | mètres |
| production_annuelle | CharField(100) | |
| fixateur_azote | BooleanField | Défaut False |
| accumulateur_dynamique | BooleanField | Défaut False |
| mellifere | BooleanField | Défaut False |
| produit_juglone | BooleanField | Défaut False |
| indigene | BooleanField | Défaut False |
| description | TextField | |
| notes | TextField | |
| usages_autres | TextField | |
| data_sources | JSONField | Données sources externes |
| photo_principale_id | FK → species_photo | SET_NULL |
| enrichment_score_pct | PositiveSmallIntegerField | 0–100 |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |
| search_vector | SearchVectorField (PostgreSQL) ou TextField | Full-text search |

---

### 2.2 `species_organismnom` — OrganismNom

Noms alternatifs (multilingue, par source).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organism_id | FK → species_espece | CASCADE |
| nom | CharField(200) | |
| langue | CharField(10) | fr, en, autre |
| source | CharField(80) | |
| principal | BooleanField | Défaut False |

---

### 2.3 `species_organismpropriete` — OrganismPropriete

Propriétés sol / exposition par organisme (1–N par source).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | CASCADE |
| type_sol | JSONField | Liste types |
| ph_min | FloatField | |
| ph_max | FloatField | |
| tolerance_ombre | CharField(20) | Choix ombre/soleil |
| source | CharField(50) | |

---

### 2.4 `species_organismusage` — OrganismUsage

Usages : comestible, médicinal, bois, etc.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | CASCADE |
| type_usage | CharField(30) | comestible_fruit, medicinal, ornement, etc. |
| parties | CharField(200) | |
| description | TextField | |
| source | CharField(50) | |

---

### 2.5 `species_organismcalendrier` — OrganismCalendrier

Périodes typiques : floraison, fructification, récolte, semis, taille.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | CASCADE |
| type_periode | CharField(20) | floraison, fructification, recolte, semis, taille, autre |
| mois_debut | PositiveSmallIntegerField | 1–12 |
| mois_fin | PositiveSmallIntegerField | 1–12 |
| source | CharField(50) | |

---

### 2.6 `species_usertag` — UserTag

Tags personnels pour organiser les organismes.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom | CharField(50) | |
| couleur | CharField(7) | Défaut #00AA00 |
| description | TextField | |
| date_creation | DateTimeField | auto_now_add |

---

### 2.7 `species_organism_mes_tags` — OrganismUserTag (through)

Table de liaison M2M Organism ↔ UserTag.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organism_id | FK → species_espece | CASCADE |
| usertag_id | FK → species_usertag | CASCADE |

**Contrainte :** `unique_together = ['organism', 'usertag']`

---

### 2.8 `species_companionrelation` — CompanionRelation

Compagnonnage entre organismes (source → cible).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_source_id | FK → species_espece | CASCADE |
| organisme_cible_id | FK → species_espece | CASCADE |
| type_relation | CharField(30) | compagnon_positif, fixateur_azote, allelopathie, etc. |
| force | IntegerField | 1–10, défaut 5 |
| distance_optimale | FloatField | mètres |
| description | TextField | |
| source_info | CharField(200) | |
| date_ajout | DateTimeField | auto_now_add |

**Contrainte :** `unique_together = ['organisme_source', 'organisme_cible', 'type_relation']`

---

### 2.9 `species_cultivar` — Cultivar

Variété / cultivar d’une espèce.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organism_id | FK → species_espece | CASCADE |
| slug_cultivar | SlugField(250) | Unique (ex. malus-pumila-dolgo) |
| nom | CharField(200) | Ex. Dolgo |
| description | TextField | |
| couleur_fruit | CharField(100) | |
| gout | CharField(200) | |
| resistance_maladies | TextField | |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |

---

### 2.10 `species_cultivar_pollinator` — CultivarPollinator

Pollinisateur recommandé au niveau cultivar (cultivar ou espèce).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| cultivar_id | FK → species_cultivar | CASCADE |
| companion_cultivar_id | FK → species_cultivar | NULL autorisé |
| companion_organism_id | FK → species_espece | NULL autorisé |
| notes | TextField | |
| source | CharField(200) | |

**Contrainte :** au moins un de `companion_cultivar` ou `companion_organism` non NULL.

---

### 2.11 `species_cultivarportegreffe` — CultivarPorteGreffe

Porte-greffe associé à un cultivar.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| cultivar_id | FK → species_cultivar | CASCADE |
| nom_porte_greffe | CharField(100) | Ex. B9, MM106 |
| vigueur | CharField(20) | nain, semi_nain, semi_vigoureux, vigoureux, standard |
| hauteur_max_m | FloatField | |
| notes | TextField | |
| source | CharField(80) | |
| disponible_chez | JSONField | Liste [{ source, age }, ...] |

---

### 2.12 `species_seedsupplier` — SeedSupplier

Fournisseur de semences.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom | CharField(200) | |
| site_web | URLField | |
| contact | CharField(200) | |
| type_fournisseur | CharField(20) | commercial, echange, recolte_perso, autre |
| mapping_config | JSONField | Config import |
| actif | BooleanField | Défaut True |
| dernier_import | DateTimeField | Optionnel |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |

---

### 2.13 `species_seedcollection` — SeedCollection

Lot de semences en inventaire.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | PROTECT |
| variete | CharField(200) | Variété ou cultivar |
| lot_reference | CharField(100) | |
| fournisseur_id | FK → species_seedsupplier | SET_NULL |
| quantite | FloatField | |
| unite | CharField(15) | graines, g, ml, sachet, s |
| date_recolte | DateField | |
| duree_vie_annees | FloatField | |
| germination_lab_pct | FloatField | |
| stratification_requise | BooleanField | Défaut False |
| stratification_duree_jours | IntegerField | |
| stratification_temp | CharField(20) | froide, chaude, chaude_puis_froide |
| stratification_notes | TextField | |
| temps_germination_jours_min/max | IntegerField | |
| temperature_optimal_min/max | FloatField | |
| pretraitement | TextField | |
| data_sources | JSONField | |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |

---

### 2.14 `species_semisbatch` — SemisBatch

Session de semis (lot → spécimens créés).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| seed_collection_id | FK → species_seedcollection | CASCADE |
| date_semis | DateField | |
| quantite_semee | FloatField | |
| unite_semee | CharField(20) | |
| methode | CharField(20) | interieur, exterieur, serre, godets, autre |
| taux_germination_reel | FloatField | |
| date_premiere_germination | DateField | |
| nb_plants_obtenus | IntegerField | |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |

---

### 2.15 `species_amendment` — Amendment

Engrais, compost, amendements du sol.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| nom | CharField(200) | |
| type_amendment | CharField(25) | compost, fumier, engrais_vert, mineraux, etc. |
| azote_n, phosphore_p, potassium_k | FloatField | % NPK |
| effet_ph | CharField(15) | acidifie, neutre, alcalinise |
| bon_pour_sols | JSONField | Liste |
| bon_pour_types | JSONField | Liste |
| description | TextField | |
| dose_recommandee | CharField(200) | |
| periode_application | CharField(200) | |
| biologique | BooleanField | Défaut True |
| date_ajout | DateTimeField | auto_now_add |

---

### 2.16 `species_organismamendment` — OrganismAmendment

Recommandation organisme ↔ amendement.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | CASCADE |
| amendment_id | FK → species_amendment | CASCADE |
| priorite | IntegerField | 1–4 (Recommandé, Utile, Optionnel, À éviter) |
| dose_specifique | CharField(200) | |
| moment_application | CharField(200) | |
| notes | TextField | |
| date_ajout | DateTimeField | auto_now_add |

**Contrainte :** `unique_together = ['organisme', 'amendment']`

---

### 2.17 `species_base_enrichment_stats` — BaseEnrichmentStats

Singleton : note d’enrichissement globale de la base.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| global_score_pct | PositiveSmallIntegerField | 0–100 |
| organism_count | PositiveIntegerField | Nombre d’organismes au calcul |
| last_updated | DateTimeField | auto_now |
| computed_at | DateTimeField | Date du dernier recalcul |

---

## 3. App **species**

### 3.1 `species_specimen` — Specimen

Plant / arbre individuel sur le terrain.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| garden_id | FK → species_garden | SET_NULL, optionnel |
| organisme_id | FK → species_espece | PROTECT |
| cultivar_id | FK → species_cultivar | SET_NULL, optionnel |
| nom | CharField(200) | Nom personnel du spécimen |
| code_identification | CharField(50) | Unique (ex. PMMDOL-001) |
| nfc_tag_uid | CharField(100) | Unique, index (tag NFC/RFID) |
| zone_id | FK → gardens_zone | SET_NULL, optionnel |
| zone_jardin | CharField(100) | Libellé libre (compatibilité) |
| latitude, longitude | FloatField | GPS |
| date_plantation | DateField | |
| age_plantation | IntegerField | Années à la plantation |
| source | CharField(20) | pepiniere, semis, bouture, greffe, etc. |
| pepiniere_fournisseur | CharField(200) | |
| seed_collection_id | FK → species_seedcollection | SET_NULL (si source=semis) |
| statut | CharField(20) | planifie, jeune, etabli, mature, declin, mort, enleve, etc. |
| sante | IntegerField | 1–10, défaut 5 |
| hauteur_actuelle | FloatField | mètres |
| premiere_fructification | IntegerField | Année |
| notes | TextField | |
| photo_principale_id | FK → species_photo | SET_NULL |
| date_ajout | DateTimeField | auto_now_add |
| date_modification | DateTimeField | auto_now |

---

### 3.2 `species_specimenfavorite` — SpecimenFavorite

Favoris utilisateur pour les spécimens.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| user_id | FK → auth_user | CASCADE |
| specimen_id | FK → species_specimen | CASCADE |

**Contrainte :** `unique_together = ['user', 'specimen']`

---

### 3.3 `species_organismfavorite` — OrganismFavorite

Favoris utilisateur pour les espèces (organismes).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| user_id | FK → auth_user | CASCADE |
| organism_id | FK → species_espece | CASCADE |

**Contrainte :** `unique_together = ['user', 'organism']`

---

### 3.4 `species_specimengroup` — SpecimenGroup

Groupe de spécimens pour pollinisation (mâle/femelle ou pollinisation croisée cultivars).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| type_groupe | CharField(30) | male_female, cross_pollination_cultivar |
| organisme_id | FK → species_espece | SET_NULL (optionnel pour cross_pollination) |
| date_ajout | DateTimeField | auto_now_add |

---

### 3.5 `species_specimengroupmember` — SpecimenGroupMember

Membre d’un groupe (specimen + rôle).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| group_id | FK → species_specimengroup | CASCADE |
| specimen_id | FK → species_specimen | CASCADE |
| role | CharField(20) | pollinisateur, principal, partenaire |

**Contrainte :** `unique_together = ['group', 'specimen']`

---

### 3.6 `species_event` — Event

Événement dans la vie d’un spécimen (plantation, arrosage, taille, récolte, etc.).

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| specimen_id | FK → species_specimen | CASCADE |
| type_event | CharField(20) | plantation, arrosage, fertilisation, taille, recolte, etc. |
| date | DateField | |
| heure | TimeField | Optionnel |
| titre | CharField(200) | Optionnel |
| description | TextField | |
| quantite | FloatField | Optionnel |
| unite | CharField(50) | |
| amendment_id | FK → species_amendment | SET_NULL |
| produit_utilise | CharField(200) | |
| temperature | FloatField | °C |
| conditions_meteo | CharField(100) | |
| date_ajout | DateTimeField | auto_now_add |

---

### 3.7 `species_reminder` — Reminder

Rappel lié à un spécimen.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| specimen_id | FK → species_specimen | CASCADE |
| type_rappel | CharField(20) | arrosage, suivi_maladie, taille, cueillette, etc. |
| date_rappel | DateField | |
| type_alerte | CharField(10) | email, popup, son (défaut popup) |
| titre | CharField(200) | |
| description | TextField | |
| recurrence_rule | CharField(20) | none, biweekly, annual, biannual |
| date_ajout | DateTimeField | auto_now_add |

---

### 3.8 `species_photo` — Photo

Photo d’un organisme, d’un spécimen ou d’un événement.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| organisme_id | FK → species_espece | CASCADE, optionnel |
| specimen_id | FK → species_specimen | CASCADE, optionnel |
| event_id | FK → species_event | CASCADE, optionnel |
| image | ImageField | upload_to='photos/%Y/%m/' |
| type_photo | CharField(35) | tronc_juvenile, feuillage_ete, reproduction_fleurs, etc. |
| titre | CharField(200) | |
| description | TextField | |
| date_prise | DateField | |
| source_url | URLField(500) | Ex. Wikimedia |
| source_author | CharField(200) | Auteur et licence |
| source_license | CharField(50) | Ex. CC-BY-SA-4.0 |
| date_ajout | DateTimeField | auto_now_add |

Au moins un de `organisme`, `specimen`, `event` est renseigné.

---

### 3.9 `species_dataimportrun` — DataImportRun

Historique des exécutions d’import / enrichissement.

| Champ | Type | Description |
|-------|------|-------------|
| id | PK | |
| source | CharField(80) | pfaf, seeds, import_vascan, merge_organism_duplicates, etc. |
| status | CharField(20) | running, success, failure |
| started_at | DateTimeField | auto_now_add |
| finished_at | DateTimeField | Optionnel |
| stats | JSONField | created, updated, errors, etc. |
| output_snippet | TextField | Derniers caractères stdout/err |
| trigger | CharField(30) | admin_import, gestion_donnees, api |
| user_id | FK → auth_user | SET_NULL |

Index : `['source', '-started_at']`

---

## 4. Schéma des relations principales

```
Garden (species_garden)
  ├── zones (Zone)
  ├── weather_records (WeatherRecord)
  ├── sprinkler_zones (SprinklerZone)
  ├── gcps (GardenGCP)
  └── specimens (Specimen)

Organism (species_espece)
  ├── noms (OrganismNom)
  ├── proprietes (OrganismPropriete)
  ├── usages (OrganismUsage)
  ├── calendrier (OrganismCalendrier)
  ├── cultivars (Cultivar)
  ├── seed_collections (SeedCollection)
  ├── specimens (Specimen)
  ├── photos (Photo)
  ├── mes_tags M2M → UserTag (via OrganismUserTag)
  ├── relations_sortantes / relations_entrantes (CompanionRelation)
  └── amendements_recommandes (OrganismAmendment)

Specimen (species_specimen)
  ├── garden (Garden), organisme (Organism), cultivar (Cultivar)
  ├── zone (Zone), seed_collection (SeedCollection)
  ├── evenements (Event), rappels (Reminder), photos (Photo)
  ├── pollination_groups (SpecimenGroupMember → SpecimenGroup)
  └── favorited_by (SpecimenFavorite)
```

---

## 5. Notes

- Plusieurs tables gardent le préfixe `species_` pour compatibilité avec les migrations existantes alors que les modèles ont été déplacés vers les apps **gardens** et **catalog**.
- Les champs JSON (`boundary`, `terrain_stats`, `data_sources`, `config`, etc.) stockent des structures librement définies ; le détail des clés peut varier selon le code qui les remplit.
- La recherche full-text sur les espèces utilise `search_vector` (GIN index) uniquement avec PostgreSQL.
