# Analyse OpenFarm → BIOT

> Document produit le 2026-03-19.
> Objectif : auditer le code OpenFarm, comparer les fonctionnalités avec BIOT, évaluer les données récupérables et proposer un backlog d'améliorations.

---

## Table des matières

1. [Audit de l'architecture OpenFarm](#1-audit-de-larchitecture-openfarm)
2. [Comparatif fonctionnel OpenFarm vs BIOT](#2-comparatif-fonctionnel-openfarm-vs-biot)
3. [Données OpenFarm : disponibilité, licence et qualité](#3-données-openfarm--disponibilité-licence-et-qualité)
4. [Backlog d'améliorations BIOT inspirées d'OpenFarm](#4-backlog-daméliorations-biot-inspirées-dopenfarm)
5. [Conclusion et recommandations](#5-conclusion-et-recommandations)

---

## 1. Audit de l'architecture OpenFarm

### 1.1 Vue d'ensemble technique

| Critère | OpenFarm | BIOT |
|---------|----------|------|
| **Framework** | Ruby on Rails | Django (Python) |
| **Base de données** | MongoDB (via Mongoid) | PostgreSQL |
| **Recherche** | Elasticsearch (Searchkick) | PostgreSQL FTS (SearchVectorField + GinIndex) |
| **API** | JSON-API v1 (partielle, alpha) | Django REST Framework |
| **Frontend** | Angular 1.5 (Rails assets) | React Native (Expo) — app mobile |
| **Images** | S3 via Paperclip (Mongoid) | Django ImageField (upload local/S3) |
| **Auth** | Devise + Token maison | Django auth + JWT |
| **Licence code** | MIT | AGPL-3.0 |
| **Licence données** | CC0 (domaine public) | — |
| **Statut** | Archivé (avr. 2025), hors-ligne | Actif, en développement |

### 1.2 Modèles de données OpenFarm

```
Crop (espèce)
├── name, binomial_name, common_names[]
├── description, sun_requirements, sowing_method
├── spread, row_spacing, height (cm)
├── days_to_maturity, growing_degree_days
├── minimum_temperature (°C)
├── taxon (Species/Genus/Family/…)
├── genus, species, cultivar_name
├── companions[] (HABTM self-referencing)
├── pictures[] (embedded)
├── tags[]
├── svg_icon
└── crop_data_source (FK → CropDataSource)

Guide (fiche de culture, 1-N par Crop)
├── name, overview, location, practices[]
├── featured_image, pictures[]
├── crop (FK → Crop), user (FK → User)
├── time_span (embedded: start/end/length)
├── stages[] (has_many)
├── completeness_score, popularity_score
├── compatibility_score (calculé vs jardin user)
└── draft (boolean)

Stage (étape de culture, 1-N par Guide)
├── name, order, stage_length (jours)
├── environment[], soil[], light[]
├── overview
├── time_span (embedded)
├── stage_actions[] (embedded)
│   └── StageAction: name, overview, time, time_unit, order, pictures[]
└── pictures[]

Garden (jardin utilisateur)
├── name, description, location, type
├── average_sun, soil_type, ph, growing_practices[]
├── is_private
└── garden_crops[] (embedded)
    └── GardenCrop: quantity, stage, sowed, guide, crop

CropDataSource (provenance)
├── source_name
└── reference

TimeSpan (période flexible)
├── start_event, start_event_format, start_offset_*
├── end_event, end_event_format, end_offset_*
└── length, length_units
```

### 1.3 Points forts conceptuels

1. **Guide de culture multi-auteur** : concept de « recette de culture » avec étapes ordonnées, actions par étape (arroser, pailler, tailler, polliniser, stratifier…), et photos par étape. Aucun équivalent dans BIOT.

2. **Score de compatibilité** : croisement automatique Guide × Garden (sol, lumière, emplacement, pratiques) → score 0–100 %. Idée intéressante pour BIOT (fiche espèce × jardin).

3. **Score de complétude** : % de champs remplis sur un Guide ; incite à enrichir.

4. **TimeSpan flexible** : pas de dates fixes, mais événements relatifs (« 2 semaines après le dernier gel »). Adapté à la diversité des hémisphères/climats.

5. **StageAction options prédéfinies** : vocabulaire contrôlé d'actions culturales (Water, Prune, Sow, Harvest, Pollinate, Stratify, Graft, Train…).

6. **Companions bidirectionnel** : relation HABTM avec back-link automatique.

### 1.4 Faiblesses et dettes techniques

1. **Stack obsolète et non maintenue** : Mongoid ~6, Angular 1.5, Elasticsearch 1.4/6.5 — aucun portage possible. Code Ruby non transposable en Python.

2. **Document DB sans schéma strict** : Mongoid embedded documents (pictures, garden_crops, stage_actions) → pas de contraintes d'intégrité. BIOT utilise PostgreSQL avec FK et contraintes explicites.

3. **Données pauvres en pratique** : FarmBot a cessé d'utiliser OpenFarm en janvier 2025, signalant que « la plupart des entrées manquaient d'informations détaillées au-delà du nom de culture » et que « la qualité des données avait été dégradée par des pratiques d'édition incohérentes ».

4. **Pas de pipeline d'import de sources externes** : les seules tâches d'import (`data_csv.rake`, `data_xml.rake`, `import_crops.rake`) créent des Crop à partir de fichiers plats (ITIS TSN, CSV basiques). Pas de normalisation, pas de fusion multi-sources.

5. **API inachevée** : étiquetée « ALPHA », pas de pagination, pas de filtrage avancé, documentation partielle.

6. **Pas de notion de spécimen** : `GardenCrop` (embedded) est un simple compteur (quantité + stade + date semis), pas un plant géolocalisé avec timeline.

7. **Pas de rusticité structurée** : un seul champ `minimum_temperature`, pas de zones USDA/Canada.

### 1.5 Verdict réutilisabilité

| Élément | Réutilisable ? | Commentaire |
|---------|---------------|-------------|
| Code source Ruby | Non | Stack incompatible, obsolète |
| Schéma MongoDB | Non (directement) | Inspiration structurelle uniquement |
| API JSON-API | Non | BIOT utilise DRF, meilleur écosystème |
| Vocabulaire `StageAction` | Oui (inspiration) | Liste d'actions culturales → enrichir `Event.TYPE_CHOICES` |
| Concept `Guide/Stage` | Oui (inspiration) | Voir backlog lot 3 : « Guide de culture » |
| Score compatibilité | Oui (inspiration) | Croisement Organism × Garden |
| Score complétude | Déjà dans BIOT | `enrichment_score_pct` |
| Données CC0 | Faible valeur | Qualité dégradée, pas de dump disponible |

---

## 2. Comparatif fonctionnel OpenFarm vs BIOT

### 2.1 Matrice fiche espèce : Crop vs Organism

| Champ / Concept | OpenFarm `Crop` | BIOT `Organism` | Couverture BIOT |
|----------------|----------------|-----------------|-----------------|
| Nom commun | `name` | `nom_commun` | Couvert |
| Nom latin | `binomial_name` | `nom_latin` | Couvert |
| Noms alternatifs | `common_names[]` | `OrganismNom` (multilingue, par source) | BIOT supérieur |
| Famille | — | `famille` | BIOT supérieur |
| Genre | `genus` | `genus` | Couvert |
| Taxon rank | `taxon` (Species…Kingdom) | `type_organisme` (17 choix fonctionnels) | Approche différente, BIOT plus pratique |
| Cultivar | `cultivar_name` (champ texte) | `Cultivar` (table dédiée FK) | BIOT supérieur |
| Description | `description` | `description` | Couvert |
| Soleil | `sun_requirements` (texte libre) | `besoin_soleil` (enum) + `OrganismPropriete` | BIOT supérieur |
| Sol | — | `sol_textures`, `sol_ph`, `sol_drainage`, `sol_richesse` + `OrganismPropriete` | BIOT supérieur |
| Eau | — | `besoin_eau` (enum) | BIOT supérieur |
| Zones de rusticité | `minimum_temperature` (int) | `zone_rusticite` (JSON multi-sources) | BIOT supérieur |
| Dimensions | `spread`, `row_spacing`, `height` (cm) | `hauteur_max`, `largeur_max` (m) | Équivalent |
| Croissance | `growing_degree_days`, `days_to_maturity` | `vitesse_croissance` (enum) + `age_fructification` | Approches différentes |
| Comestibilité | — | `comestible`, `parties_comestibles`, `toxicite` | BIOT supérieur |
| Usages | — | `OrganismUsage` (10 types détaillés) | BIOT supérieur |
| Compagnonnage | `companions[]` (HABTM simple) | `CompanionRelation` (15 types, force, distance) | BIOT très supérieur |
| Pollinisation | — | `pollinisation`, `distance_pollinisation_max`, `CultivarPollinator` | BIOT supérieur |
| Calendrier | — | `OrganismCalendrier` (floraison, récolte, semis, taille) | BIOT supérieur |
| Photos | `pictures[]` (embedded) | `Photo` (table avec 22 types catégorisés) | BIOT supérieur |
| Sources de données | `crop_data_source` (1 source) | `data_sources` (JSON multi-sources) + pipeline import | BIOT très supérieur |
| Icône SVG | `svg_icon` | — | Absent dans BIOT |
| Sowing method | `sowing_method` (texte) | — | Absent dans BIOT (→ backlog) |
| Multiplication | — | — | Absent dans les deux |
| Entretien structuré | — | — | Absent dans les deux |
| Description feuilles/fleurs/fruits | — | — | Absent dans les deux |

### 2.2 Matrice Guide de culture : Guide/Stage vs tables BIOT

| Concept OpenFarm | Tables BIOT existantes | Couverture | Gap |
|-----------------|----------------------|------------|-----|
| **Guide** (fiche de culture contributive) | Pas de table équivalente | Non couvert | Concept à forte valeur |
| **Stage** (étape ordonnée : Germination → Seedling → Adult → Flowering → Fruit → Dormant) | `OrganismCalendrier` (périodes mois) | Partiel | Calendrier = quand. Stage = quoi faire à chaque phase |
| **StageAction** (Water, Prune, Sow, Harvest, Pollinate, Stratify, Graft, Train…) | `Event.TYPE_CHOICES` (17 types) | Partiel | Event = journal passé. StageAction = instruction prospective |
| **TimeSpan** (période relative au climat) | `OrganismCalendrier.mois_debut/mois_fin` | Partiel | Mois fixes vs événements climatiques |
| Score compatibilité Guide × Garden | — | Non couvert | Intéressant pour recommandations |
| Score complétude Guide | `enrichment_score_pct` | Équivalent | Déjà couvert |
| Score popularité | — | Non couvert | Moins prioritaire |
| Pratiques (organic, permaculture…) | — | Non couvert | Utile pour filtrage |

### 2.3 Matrice Jardin et suivi : Garden/GardenCrop vs BIOT

| Concept OpenFarm | Tables BIOT | Couverture | Commentaire |
|-----------------|------------|------------|-------------|
| Garden (nom, type, sol, pH, lumière, pratiques) | `Garden` (adresse, coord, météo, terrain 3D, zones, seuils alertes) | BIOT très supérieur | BIOT ajoute GeoJSON, WeatherRecord, SprinklerZone, GCP |
| GardenCrop (quantity, stage, sowed) | `Specimen` (plant individuel, GPS, NFC, cultivar, statut, santé) | BIOT très supérieur | Specimen ≫ GardenCrop en richesse |
| Photos jardin | `Photo` (organisme, specimen, event) | BIOT supérieur | Catégorisation fine |
| Historique (GardenCrop.stage tracking) | `Event` (17 types, quantités, conditions) + `Reminder` | BIOT très supérieur | Timeline complète |
| Favoris | — | `SpecimenFavorite`, `OrganismFavorite` | BIOT supérieur |
| Groupes pollinisation | — | `SpecimenGroup`, `SpecimenGroupMember` | BIOT supérieur |

### 2.4 Synthèse par catégorie

| Catégorie | Verdict |
|-----------|---------|
| Fiche espèce (données botaniques) | **BIOT supérieur** : plus de champs structurés, multi-sources, pipeline d'import |
| Cultivars et pollinisation | **BIOT supérieur** : tables dédiées, groupes de pollinisation |
| Compagnonnage | **BIOT très supérieur** : 15 types de relations vs HABTM simple |
| Guide de culture (instructions) | **OpenFarm supérieur** : concept Guide/Stage/StageAction absent dans BIOT |
| Jardin et suivi terrain | **BIOT très supérieur** : Specimen géolocalisé, NFC, météo, 3D, zones |
| Événements et historique | **BIOT supérieur** : Event + Reminder + Photo par event |
| Semences et semis | **BIOT supérieur** : SeedCollection, SemisBatch (inexistant dans OpenFarm) |
| Amendements | **BIOT supérieur** : Amendment, OrganismAmendment (inexistant dans OpenFarm) |
| Recherche | **Comparable** : Elasticsearch vs PostgreSQL FTS |
| Import de données | **BIOT très supérieur** : 10+ sources, pipeline normalisation/fusion |

---

## 3. Données OpenFarm : disponibilité, licence et qualité

### 3.1 Licence

Les données OpenFarm sont sous **CC0 (domaine public)** — aucune restriction juridique d'utilisation, même commerciale.

### 3.2 Disponibilité effective

| Source potentielle | Disponible ? | Commentaire |
|-------------------|-------------|-------------|
| API en ligne (`openfarm.cc/api/v1/crops`) | Non | Serveurs éteints depuis avril 2025 |
| Dump MongoDB officiel | Non trouvé | Aucun export officiel publié avant fermeture |
| Wayback Machine (captures API) | Très partiel | Quelques pages HTML indexées, pas de dump JSON systématique |
| Seed de développement (`db/seeds.rb`) | Oui (code) | Données factices (Tomato, Cherry, Grass, Banana, Water Lily) — aucune valeur |
| Tâches d'import CSV/XML | Oui (code) | Scripts basiques pour ITIS ; pas de données incluses |
| FarmBot cache/mirror | Non | FarmBot a abandonné OpenFarm en janvier 2025 et développé son propre catalogue interne |

### 3.3 Qualité des données (retour FarmBot, janvier 2025)

FarmBot, principal consommateur de l'API OpenFarm, a formalisé les problèmes suivants :

- « La plupart des entrées OpenFarm manquaient d'informations détaillées au-delà du nom de culture. »
- « La qualité des données s'est dégradée avec le temps à cause de pratiques d'édition incohérentes. »
- « L'architecture d'OpenFarm ne pouvait pas gérer correctement les problèmes de qualité des données. »
- « Les résultats de recherche contenaient des données limitées et des icônes de plantes génériques. »

### 3.4 Évaluation pour BIOT

| Critère | Note | Détail |
|---------|------|--------|
| Licence | Excellente (CC0) | Aucun obstacle juridique |
| Accessibilité | Très faible | Pas de dump disponible, serveurs éteints |
| Qualité | Faible | Confirmé par FarmBot ; données incomplètes et dégradées |
| Volume | ~quelques milliers de Crops | Faible par rapport aux 1700+ HQ ou 33000+ VASCAN déjà ciblés par BIOT |
| Pertinence pour Québec | Faible | OpenFarm était international sans zonage ; BIOT cible principalement le Québec |
| Valeur ajoutée vs sources BIOT | Marginale | HQ, PFAF, VASCAN, USDA couvrent mieux les besoins BIOT |

### 3.5 Recommandation données

**Ne pas investir de temps à tenter de récupérer des données OpenFarm.** Les sources actuelles de BIOT (Hydro-Québec, PFAF, VASCAN, USDA, Ville de Québec, Ville de Montréal) sont supérieures en qualité, en volume, en pertinence locale et en accessibilité.

L'intérêt d'OpenFarm pour BIOT est exclusivement **conceptuel et architectural** (voir backlog ci-dessous).

---

## 4. Backlog d'améliorations BIOT inspirées d'OpenFarm

### Lot 1 — Champs fiche espèce (enrichissement `Organism`)

| # | Amélioration | Inspiration OF | Priorité | Effort |
|---|-------------|---------------|----------|--------|
| 1.1 | Ajouter `methode_semis` (enum : direct, intérieur, serre, transplant) | `sowing_method` | Moyenne | Faible |
| 1.2 | Ajouter `jours_maturite` (int) | `days_to_maturity` | Moyenne | Faible |
| 1.3 | Ajouter `degres_jours_croissance` (int) | `growing_degree_days` | Basse | Faible |
| 1.4 | Ajouter `espacement_rang_cm` (float) | `row_spacing` | Moyenne | Faible |
| 1.5 | Ajouter `espacement_plant_cm` (float) | `spread` | Moyenne | Faible |
| 1.6 | Structurer **description feuilles** (champ texte ou JSON) | Gap partagé | Haute | Moyen |
| 1.7 | Structurer **description fleurs** (couleur, forme, époque) | Gap partagé | Haute | Moyen |
| 1.8 | Structurer **description fruits** (aspect, maturation, taille) | Gap partagé | Haute | Moyen |
| 1.9 | Ajouter `port_silhouette` (enum : érigé, étalé, pleureur, colonnaire, buissonnant…) | Gap partagé | Haute | Faible |
| 1.10 | Ajouter bloc **multiplication** (table ou JSON : bouture, semis, greffe, marcottage, division + période + difficulté) | Gap partagé | Haute | Moyen |
| 1.11 | Ajouter bloc **entretien** (table ou JSON : taille, arrosage, protection hivernale + fréquence + période) | Gap partagé | Haute | Moyen |
| 1.12 | Ajouter `precautions` (texte) — distinct de `toxicite` | Gap partagé | Moyenne | Faible |
| 1.13 | Ajouter `pratiques_recommandees` (JSON list : bio, permaculture, hydro…) | `Guide.practices` | Basse | Faible |

### Lot 2 — Pipeline import / transformation

| # | Amélioration | Inspiration OF | Priorité | Effort |
|---|-------------|---------------|----------|--------|
| 2.1 | Vocabulaire contrôlé d'actions culturales (référentiel) | `StageActionOption` seeds | Moyenne | Faible |
| 2.2 | Enrichir `Event.TYPE_CHOICES` avec : stratification, greffe, train/tuteur, biocontrôle, couverture, scarification, pollinisation manuelle | `StageAction` seeds | Moyenne | Faible |
| 2.3 | Commande `import_openfarm` — **annulée** (pas de dump, données pauvres) | — | Annulée | — |

### Lot 3 — UX/API : fiche enrichie et vue « étapes de culture »

| # | Amélioration | Inspiration OF | Priorité | Effort |
|---|-------------|---------------|----------|--------|
| 3.1 | **Vue « Guide de culture » dérivée** : générer automatiquement un guide par espèce à partir de `OrganismCalendrier` + champs Organism (sol, eau, soleil) + `OrganismUsage` | `Guide` concept | Haute | Élevé |
| 3.2 | **Étapes de vie prédéfinies** : Preparation → Germination → Seedling → Juvenile → Adult → Flowering → Fruit → Dormant | `StageOption` seeds | Haute | Moyen |
| 3.3 | **Score compatibilité Organism × Garden** : croisement automatique sol/lumière/zone rusticité/eau entre une espèce et le jardin par défaut de l'utilisateur → score 0–100 % | `Guide.compatibility_score` | Haute | Élevé |
| 3.4 | **Événements attendus** : à partir de `OrganismCalendrier`, afficher « Ce mois-ci : floraison attendue (Pommier), récolte attendue (Poire) » et proposer un rappel | Concept Stage | Haute | Moyen |
| 3.5 | **Actions suggérées par saison** : « En mars : tailler les pommiers, stratifier les semences de noyer, préparer le sol » — dérivé d'OrganismCalendrier + multiplication + entretien | `StageAction` concept | Moyenne | Élevé |
| 3.6 | Vue fiche 3 onglets (Description / Culture / Utilisation) enrichie avec les nouveaux champs lots 1.6–1.12 | Fiche type existante | Haute | Moyen |

### Priorisation résumée

```
Priorité HAUTE (printemps 2026) :
  Lot 1 : 1.6, 1.7, 1.8, 1.9, 1.10, 1.11 (structuration fiches)
  Lot 3 : 3.1, 3.2, 3.3, 3.4, 3.6 (UX/guide de culture + compatibilité)

Priorité MOYENNE (été 2026) :
  Lot 1 : 1.1, 1.2, 1.4, 1.5, 1.12
  Lot 2 : 2.1, 2.2 (vocabulaire actions)
  Lot 3 : 3.5 (actions suggérées)

Priorité BASSE :
  Lot 1 : 1.3, 1.13
```

---

## 5. Conclusion et recommandations

### Décision principale

**OpenFarm = inspiration uniquement, pas de réutilisation de code ni de données.**

- Le code Ruby/Mongoid est techniquement incompatible et obsolète.
- Les données sont inaccessibles (serveurs éteints, pas de dump) et de faible qualité (confirmé par FarmBot).
- Les sources de données BIOT (HQ, PFAF, VASCAN, USDA) sont supérieures à tous les niveaux.

### Ce que BIOT doit retenir d'OpenFarm

1. **Le concept de Guide de culture par étapes** est le principal apport intellectuel. BIOT peut le générer automatiquement à partir de ses données existantes (OrganismCalendrier, OrganismUsage, OrganismPropriete) plutôt que de dépendre de contributions communautaires incohérentes.

2. **Le score de compatibilité espèce × jardin** est une fonctionnalité à forte valeur UX, réalisable avec les données structurées que BIOT possède déjà (sol, lumière, eau, zone rusticité du Garden vs de l'Organism).

3. **Le vocabulaire d'actions culturales** (StageActionOption) est un référentiel utile pour enrichir les types d'événements BIOT et alimenter les suggestions proactives.

4. **La structuration des fiches** (feuilles, fleurs, fruits, port, multiplication, entretien) est un gap partagé entre OpenFarm et BIOT, mais BIOT est mieux positionné pour le combler grâce à son pipeline multi-sources (données Hydro-Québec contenant déjà des descriptions dans `data_sources`).

### Statut source OpenFarm dans BIOT

Mettre à jour le README et `docs/sources-donnees.md` pour refléter :
- OpenFarm : **annulé comme source de données** (pas de dump, qualité insuffisante, serveurs éteints).
- OpenFarm : **utilisé comme inspiration architecturale** pour le concept Guide de culture et le score de compatibilité.
