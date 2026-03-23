# Import des espèces : purification, spécialisation et enrichissement

> **Où vivent les imports de masse (2025–2026)** — Les **imports botaniques lourds** (Hydro-Québec, PFAF, VASCAN, etc.) s’exécutent sur le projet **Radix Sylva** (API **`https://radix.jardinbiot.ca/api/v1`** en production). **Jardin bIOT** synchronise une copie locale via **`sync_radixsylva`** (`RADIX_SYLVA_API_URL` dans `.env`). Ne pas lancer ces imports en masse depuis BIOT ; voir **`docs/radix-biot-pass-c.md`**.

Ce document décrit comment le système transforme les données brutes des sources en une base d’espèces et de cultivars **exploitable** (logique métier, fusion multi-sources). Il sert de **référence technique** ou pour expliquer la construction de la base. L’**interface** « Gestion des données » sur BIOT est décrite au §1.1 dans sa forme **actuelle** (Pass C).

---

## 1. Vue d’ensemble

Le pipeline va **de la source à la base** en trois étapes :

```
Source (fichier / API)  →  Purifier  →  Spécialiser  →  Enrichir  →  Base (Organism + Cultivar)
```

- **Purification** : nettoyage des noms (espaces, caractères typographiques), retrait des auteurs et des variantes en parenthèses, normalisation pour éviter doublons et mauvais rattachements.
- **Spécialisation** : séparation **espèce** (une entrée par nom scientifique de base) et **cultivar** (lié à l’espèce) ; attribution de la **famille** botanique quand la source la fournit.
- **Enrichissement** : fusion de plusieurs sources sur la même espèce (identifiants, nom latin, zones de rusticité, description, usages, etc.) sans tout faire reposer sur une seule source.

En sortie, une **espèce** = un enregistrement `Organism` (nom latin de base, nom commun, famille, type, rusticité, etc.) ; les **cultivars** sont dans la table `Cultivar` rattachée à l’espèce. Les données brutes de chaque source sont conservées dans `Organism.data_sources[source_id]`.

### 1.1 Page « Gestion des données » (Jardin bIOT — Pass C)

URL **`/admin/gestion-donnees/`** (staff uniquement) — `species/views.py` (`gestion_donnees_view`), template `gestion_donnees.html`.

**Comportement actuel** :

- **Bandeau Radix** : rappel que les imports de masse vivent sur **Radix Sylva** ; sur BIOT on synchronise avec **`sync_radixsylva`** (API configurée par `RADIX_SYLVA_API_URL`, ex. `https://radix.jardinbiot.ca/api/v1`).
- **Statistiques** : vue d’ensemble (organismes, spécimens, cultivars, couverture par champ, par source dans `data_sources`, etc.) — inchangé pour le suivi du **cache** local.
- **Import VASCAN (fichier)** : **désactivé** — message pour utiliser Radix puis `sync_radixsylva`.
- **Hydro-Québec** : blocs « téléchargement / import JSON local » **conservés en transition** (préparation de fichiers) ; le flux recommandé reste Radix + sync.
- **Commandes exposées** (formulaires) : uniquement **`sync_radixsylva`**, **`rebuild_search_vectors`**, **`wipe_db_and_media`** — voir `species/api_views.ALLOWED_ADMIN_COMMANDS`.
- **Backup / restore** espèces (`pg_dump` / fichier) : toujours disponibles pour la base BIOT locale.
- **Historique** `DataImportRun` et **journal** session : pour tracer les exécutions encore pertinentes.

*Ancienne description* (upload VASCAN web, longue liste de commandes d’import sur BIOT) : obsolète après Pass C ; le pipeline conceptuel des § suivants s’applique surtout au travail **sur Radix** ou à l’historique des données.

---

## 2. Choix technologiques

Cette section détaille les décisions d’architecture : où sont stockées les données multi-sources, comment on fusionne, et pourquoi deux représentations (champs sur Organism vs tables normalisées) coexistent.

### 2.1 Organism comme pivot unique

- **Une espèce = un enregistrement Organism.** Toutes les sources (Hydro-Québec, PFAF, VASCAN, USDA, une future source « Akène », etc.) alimentent ou enrichissent le même enregistrement. Le matching se fait par identifiants (TSN, VASCAN) ou par nom latin / nom commun (voir §5).
- **Avantage** : une seule fiche à maintenir, pas de doublons, fusion explicite par champ ou par source.
- **Implémentation** : les commandes d’import utilisent `find_or_match_organism` / `find_organism_and_cultivar` dans `species/source_rules.py` pour retrouver ou créer l’Organism, puis mettent à jour ses champs et `data_sources[source_id]`.

### 2.2 Données brutes par source : `data_sources` (JSON)

- Chaque import enregistre le **bloc brut** de la source dans `Organism.data_sources[source_id]` (ex. `hydroquebec`, `pfaf`, `vascan`, `usda`). Ce bloc n’est pas normalisé : c’est la réponse API ou la ligne CSV telle quelle (ou un sous-ensemble).
- **Rôle** : traçabilité, re-import ou recalcul possible sans refaire l’appel externe, et possibilité d’afficher « source : Hydro-Québec » à côté d’un champ.
- **Pas de schéma imposé** : la structure de chaque bloc dépend de la source (ex. clés camelCase pour Hydro, colonnes PFAF mappées en snake_case).

### 2.3 Champs « principaux » sur Organism (stratégie A — JSON / scalaires)

Les champs directement utilisables pour affichage, filtres et API sont sur la table **Organism** :

| Type | Exemples | Format |
|------|----------|--------|
| **Rusticité** | `zone_rusticite` | JSON : liste `[{ "zone": "4a", "source": "hydroquebec" }, { "zone": "5", "source": "pfaf" }]` — une entrée par source, fusion additive. |
| **Sol** | `sol_textures`, `sol_ph` | JSON : listes de valeurs (ex. `["argileux", "limoneux"]`, `["acide", "neutre"]`). |
| **Sol (scalaire)** | `sol_drainage`, `sol_richesse`, `besoin_eau`, `besoin_soleil` | Une valeur par organisme (CharField). |

**Qui écrit ces champs ?** Uniquement les **commandes d’import** (Hydro-Québec, PFAF, VASCAN, USDA, etc.). Elles mettent à jour les champs Organism selon le mode de fusion (overwrite ou fill_gaps) et la priorité par champ (`source_rules.FIELD_PRIMARY_SOURCE`). Aucune commande d’import n’écrit directement dans `OrganismPropriete`.

### 2.4 Tables normalisées avec `source` (stratégie B)

Les tables **OrganismPropriete**, **OrganismUsage**, **OrganismCalendrier** stockent des données **par source** (1–N lignes par organisme) :

- **OrganismPropriete** : `type_sol` (JSON), `ph_min`, `ph_max`, `tolerance_ombre`, `source`.
- **OrganismUsage** : `type_usage`, `parties`, `description`, `source`.
- **OrganismCalendrier** : `type_periode`, `mois_debut`, `mois_fin`, `source`.

**OrganismNom** (noms alternatifs multilingues) : `organism`, `nom`, `langue` (fr/en/autre), `source`, `principal`. Remplie par des imports dédiés (ex. **import_arbres_en_ligne**) ; `Organism.nom_commun` reste le nom principal.

**CultivarPorteGreffe** (porte-greffe par cultivar) : `cultivar`, `nom_porte_greffe`, `vigueur`, `hauteur_max_m`, `notes`, `source`, `disponible_chez` (JSON liste d’objets ex. `[{"source": "ancestrale", "age": "1.5"}]`). Remplie par **import_ancestrale**.

**Qui les remplit ?** OrganismPropriete, OrganismUsage, OrganismCalendrier : pas les imports. La commande **`populate_proprietes_usage_calendrier`** lit les champs Organism (et éventuellement `data_sources`) et **dérive** les lignes dans ces tables. Elle est conçue pour être exécutée **après** les imports (voir §6 ordre recommandé). Priorité pour la source des propriétés : Hydro-Québec > USDA > PFAF.

### 2.5 Pourquoi deux couches (A et B) — et la logique actuelle

**Le problème** : deux stratégies de stockage multi-sources coexistent :

- **Stratégie A** : JSON (ou scalaire) dans la table principale — `zone_rusticite`, `sol_textures`, `sol_ph`, etc.
- **Stratégie B** : table normalisée avec colonne `source` — OrganismPropriete (et OrganismUsage, OrganismCalendrier).

Sans règle claire, on pourrait se demander : « Quand j’importe une nouvelle source (ex. Akène), j’écris où ? Dans le JSON de Organism ou dans OrganismPropriete ? »

**Règle actuelle (et pourquoi c’est cohérent)** :

1. **Source de vérité = Organism.** Tous les imports (Hydro-Québec, PFAF, VASCAN, USDA, ou une future source type Akène) écrivent **uniquement** dans la table Organism : mise à jour des champs `zone_rusticite`, `sol_textures`, `sol_ph`, `besoin_soleil`, etc., et enregistrement du bloc brut dans `data_sources[source_id]`. Aucun import ne crée ni ne met à jour des lignes OrganismPropriete.
2. **Tables normalisées = dérivées.** OrganismPropriete (et Usage, Calendrier) sont des **vues dérivées** pour requêtes/filtres/affichage « par source ». Elles sont remplies par la commande **`populate_proprietes_usage_calendrier`**, qui lit Organism (et `data_sources`) et crée une ligne par source pertinente (ex. une OrganismPropriete avec `source=hydroquebec` à partir de `organism.sol_textures`, `organism.sol_ph`, `organism.besoin_soleil`).
3. **Où écrire pour une nouvelle source ?** Toujours dans Organism (champs principaux + `data_sources[source_id]`). Ensuite, soit on étend `populate_proprietes_usage_calendrier` pour qu’elle prenne en compte cette source et crée des lignes OrganismPropriete avec `source=akene`, soit on laisse les propriétés uniquement sur Organism (stratégie A suffit pour l’affichage « une valeur par champ »).

**Résumé** : pas de concurrence réelle — Organism est la cible des imports ; les tables normalisées sont un remplissage post-import optionnel pour exploiter la dimension « par source » (ex. « afficher la fiche sol par source »).

### 2.6 Fusion : fill_gaps vs overwrite, priorité par champ

- **Mode overwrite** (défaut Hydro-Québec) : les champs sont écrasés par les valeurs de la source courante.
- **Mode fill_gaps** (défaut PFAF) : on ne remplit que les champs actuellement vides ; on préserve les données déjà présentes (ex. ne pas écraser la rusticité Hydro par PFAF).
- **Priorité par champ** (`species/source_rules.py`, `FIELD_PRIMARY_SOURCE`) : pour l’affichage ou la prise de décision « quelle valeur montrer », une source est privilégiée par champ (ex. rusticité/sol → Hydro-Québec, description/usages → PFAF, indigène → VASCAN). Utilisé notamment quand on fusionne après un merge de doublons ou pour cohérence d’affichage.

### 2.7 Zones de rusticité : format JSON multi-sources

Le champ `zone_rusticite` est une liste d’objets `{ "zone": "4a", "source": "hydroquebec" }`. Chaque source peut contribuer une zone ; il n’y a pas d’écrasement d’une source par l’autre (fusion additive par source). Les helpers `get_zones_by_source(organism, source)` et `get_primary_zone(organism)` (dans `catalog/models.py`) permettent d’exploiter ce format (tri par zone la plus « froide » pour la zone principale).

---

## 3. Purification des données

### Nettoyage des noms

- **Trim** : suppression des espaces en début et fin.
- **Espaces multiples** : normalisation en un seul espace.
- **Guillemets typographiques** : les apostrophes/guillemets Unicode (U+2018, U+2019) sont convertis en apostrophe ASCII pour un traitement uniforme (détection des cultivars, matching).

### Parsing du nom latin

Pour éviter doublons et permettre le bon rattachement espèce/cultivar, le système :

1. **Retire les auteurs** en fin de nom (ex. *Vaccinium corymbosum* L. → *Vaccinium corymbosum*).
2. **Retire les cultivars** indiqués en guillemets en fin de chaîne (ex. *Vaccinium corymbosum* 'Bluecrop' → espèce *Vaccinium corymbosum* + cultivar Bluecrop).
3. **Ignore les parenthèses de variante** en fin (ex. *Amelanchier alnifolia* 'Smokey' (*Amelanchier alnifolia* 'Smoky') → on ne garde que la première forme pour le parsing).

Ces règles sont implémentées dans `species/source_rules.py` (fonctions `parse_cultivar_from_latin`, `latin_name_without_author`, et les regex associées). Le but est d’obtenir un **nom de base stable** pour l’espèce et, le cas échéant, un **nom de cultivar** propre.

---

## 4. Spécialisation : espèce, cultivar, famille

### Espèce

- **Une espèce = un enregistrement Organism** : nom scientifique de base (`nom_latin`), nom commun (`nom_commun`), famille, type (arbre, arbuste, vivace, etc.), zones de rusticité, sol, exposition, description, etc.
- Le **slug** dérivé du nom latin (`slug_latin`) sert de clé unique pour la fusion entre sources.

### Cultivar

- Un **cultivar** est une entrée dans la table **Cultivar**, liée à un **Organism** (l’espèce).
- Il est reconnu dans le nom latin par le motif **'Nom'** en fin de chaîne (ex. *Malus pumila* 'Dolgo' → espèce *Malus pumila* + cultivar Dolgo).
- À l’import, si le nom contient ce motif, le système crée ou retrouve l’espèce de base puis crée ou retrouve le cultivar sous cette espèce (via `find_organism_and_cultivar`). Les anciennes données où un cultivar était stocké comme Organism séparé peuvent être migrées avec la commande `migrate_cultivar_organisms`.

### Famille

- La **famille** botanique est le champ `Organism.famille`, fourni par la source (Hydro-Québec, PFAF selon le mapping). Aucune déduction automatique n’est faite à partir du nom latin dans la version actuelle.

### D’où viennent les données

| Source        | Apport principal                                      |
|---------------|--------------------------------------------------------|
| Hydro-Québec  | Arbres/arbustes : rusticité, sol, exposition, dimensions, descriptions (feuilles, fleurs, fruits). |
| PFAF          | Plantes tempérées : comestibilité, usages (médicinal, autre), toxicité, zones, culture. |
| VASCAN        | Noms scientifiques, noms vernaculaires, statut indigène, distribution. |
| USDA / ITIS   | TSN (identifiant taxonomique), noms acceptés.          |
| Villes (QC, Mtl) | Présence en inventaire, noms.                      |

Chaque source peut créer de nouvelles espèces ou enrichir des espèces déjà présentes. **Aucune source n’est obligatoire** : le système ne dépend pas d’Hydro-Québec en particulier ; il fusionne ce qui est disponible.

---

## 5. Enrichissement multi-sources

### Liaison de la même espèce entre sources

Pour savoir si une ligne importée correspond à une espèce déjà en base, le système applique l’ordre suivant (dans `find_or_match_organism`) :

1. **Identifiant VASCAN** (`vascan_id`) si fourni.
2. **Identifiant ITIS** (`tsn`) si fourni.
3. **Nom latin** : match exact, puis nom sans auteur, puis match flou par mots.
4. **Nom commun** si le nom latin ne donne rien.
5. Sinon **création** d’un nouvel Organism (nom latin requis).

Cela évite les doublons quand plusieurs sources décrivent la même espèce.

### Stockage par source

- Chaque source stocke son **bloc brut** dans `Organism.data_sources[source_id]` (ex. `hydroquebec`, `pfaf`). Les champs principaux du modèle (zone de rusticité, description, etc.) sont remplis à partir de ces blocs selon la stratégie de fusion.

### Fusion des champs principaux

- **Mode fill_gaps** : ne remplir que les champs actuellement vides (ne pas écraser ce qui existe). Utilisé par défaut pour PFAF pour préserver les données Hydro-Québec.
- **Mode overwrite** : écraser les champs avec les valeurs de la source courante (défaut pour Hydro-Québec).
- **Priorité par champ** : lorsqu’une même information peut venir de plusieurs sources, une source « principale » peut être privilégiée (ex. zone de rusticité et sol → Hydro ; description et usages → PFAF). Ces règles sont définies dans `species/source_rules.py` (`FIELD_PRIMARY_SOURCE`).

### Zones de rusticité

- Les zones sont stockées dans un champ structuré : **une entrée par source** (ex. zone 4a pour Hydro, zone 5 pour PFAF). La fusion est additive par source (pas d’écrasement d’une source par l’autre).

### Enrichissement des fiches (score et API)

En plus de la fusion multi-sources à l’import, le système propose un **enrichissement à la demande** et une **note d’enrichissement** par fiche.

#### Note d’enrichissement (0–100 %)

- **Champ** : `Organism.enrichment_score_pct` (optionnel, recalculé).
- **Calcul** : `species/enrichment_score.py` — `compute_organism_enrichment_score(organism)` compte combien de « critères enrichissants » sont remplis (nom_commun, nom_latin, famille, zone_rusticite, sol_*, description, parties_comestibles, usages_autres, présence de propriétés/usages/calendrier, photo, etc.). Le score = (nombre de critères remplis / total) × 100.
- **Recalcul global** : `update_enrichment_scores()` met à jour `enrichment_score_pct` pour tous les organismes et remplit (ou met à jour) le singleton **BaseEnrichmentStats** (note moyenne globale, nombre d’espèces, `computed_at`). Cette fonction est appelée à la fin de `populate_proprietes_usage_calendrier` pour garder une note cohérente après peuplement des tables dérivées.
- **Usage** : indicateur de complétude des fiches (dashboard, priorisation des espèces à enrichir).

#### API « Enrichir cette espèce »

- **Endpoint** : `POST /api/organisms/{id}/enrich/` (réservé aux utilisateurs staff).
- **Rôle** : appeler des APIs externes (VASCAN, USDA/ITIS, Botanipedia) pour **cet** organisme et mettre à jour la fiche sans refaire un import massif. Implémentation dans `species/enrichment.py` : `enrich_organism(organism, sources=None, delay=...)`.
- **Sources utilisées** :
  - **VASCAN** : `vascan_id`, `data_sources['vascan']`, champ `indigene` si fourni.
  - **USDA/ITIS** : `tsn`, `data_sources['usda']`.
  - **Botanipedia** : extrait de description / usage dans `data_sources['botanipedia']`, éventuellement fusionné dans `description` ou `usages_autres`.
- **Comportement** : requêtes HTTP avec délai entre appels (éviter surcharge des APIs). Le résultat est retourné par source (succès / message) au client (admin ou app mobile).

---

## 6. Étapes d’import en pratique

### Hydro-Québec

- **Contenu** : arbres et arbustes (rusticité, sol, exposition, dimensions, descriptions).
- **Commande** : `python manage.py import_hydroquebec --limit N` ou `--file arbres.json`.
- **Options** :
  - `--merge overwrite` (défaut) ou `--merge fill_gaps` pour préserver les champs déjà remplis par une autre source.
  - `--fetch-details` : pour les fiches incomplètes (fruits/feuilles/fleurs vides), récupère la fiche détail via l’API (plus lent).
  - `--enrich-from-api` : avec `--file`, complète les données via l’API partiel.
- **Flux** : lecture API ou fichier → nettoyage des noms → parsing cultivar → création ou match de l’Organism (et du Cultivar si besoin) → mise à jour des zones et des champs selon le mode merge → enregistrement du bloc brut dans `data_sources['hydroquebec']`.

### PFAF

- **Contenu** : plantes tempérées, comestibilité, usages (médicinal, autre), toxicité, zones de rusticité, culture. Base payante (pfaf.org).
- **Format type** : colonnes Latin Name, Common Name, Habit, Height, Hardiness, Growth, Soil, Shade, Moisture, Edible, Medicinal, Other (et variantes selon l’export). Les noms de colonnes sont normalisés (snake_case) et mappés via `species/pfaf_mapping.py` (`PFAF_FIELD_ALIASES`).
- **Commande** : `python manage.py import_pfaf --file pfaf.csv` (ou .json, .sqlite).
- **Merge** : par défaut `fill_gaps` pour ne pas écraser les données déjà présentes (ex. Hydro).
- **Flux** : chargement du fichier → pour chaque ligne, résolution du nom latin et du nom commun → parsing cultivar → création ou match Organism (+ Cultivar si besoin) → zones et champs fusionnés → bloc brut dans `data_sources['pfaf']`.

### Arbres en ligne

- **Contenu** : noms français, latin et anglais (CSV 3 colonnes). Source : Arbres en ligne (liste québécoise).
- **Commande** : `python manage.py import_arbres_en_ligne --file <chemin_csv>`.
- **Mode create_only** : crée un `Organism` uniquement si le `slug_latin` (dérivé du nom latin) n’existe pas ; sinon l’organisme n’est pas modifié. **OrganismNom** (FR + EN) est toujours créé ou mis à jour avec `source="arbres_en_ligne"`. En fin d’import, la commande **`rebuild_search_vectors`** est appelée pour recalculer le champ de recherche full-text sur les organismes.

### Pépinière ancestrale

- **Contenu** : cultivars et porte-greffes (CSV 1 colonne par ligne : « TypePlante Cultivar [PorteGreffe] [Age] »). Ne crée jamais d’Organism ; résolution TypePlante → espèce via `species/ancestrale_mapping.py`.
- **Commande** : `python manage.py import_ancestrale --file <chemin_csv>`.
- **Flux** : parsing de la ligne (porte-greffe : B118, B9, MM106, etc. ; âge : regex) → résolution Organism par nom latin du mapping → création ou récupération du Cultivar → création ou mise à jour de **CultivarPorteGreffe** avec `disponible_chez` (append idempotent : pas de doublon `{"source": "ancestrale", "age": X}`).

### Recherche full-text (PostgreSQL)

- **Champ** : `Organism.search_vector` (SearchVectorField, nullable). Mis à jour par un **signal post_save** sur Organism (pondération A : nom_commun, nom_latin ; B : description ; C : usages_autres) et par la commande **`rebuild_search_vectors`** après les imports en bulk (le signal ne se déclenche pas sur `bulk_create` / `bulk_update`).

### Autres sources

- **VASCAN, USDA, Villes, arbres Québec/Montréal** : voir [docs/sources-donnees.md](sources-donnees.md) pour les commandes et le détail. Même logique de match (identifiants, nom latin, nom commun) et d’enrichissement.

### Ordre recommandé

1. **Catalogue** : créer ou étendre la base avec une source (Hydro-Québec, PFAF ou VASCAN avec `--file`).
2. **Enrichissement** : lancer les imports en mode enrichissement (VASCAN `--enrich`, USDA `--enrich`) et/ou PFAF avec `--merge fill_gaps`.
3. **Merge doublons** : fusionner les lignes qui correspondent à la même espèce (même nom latin normalisé / nom commun).
4. **Migration cultivars** : si des anciennes données ont des cultivars stockés comme Organism séparés, lancer `migrate_cultivar_organisms` pour les convertir en espèce + Cultivar.
5. **Propriétés / usages / calendrier** : `populate_proprietes_usage_calendrier` pour remplir les tables dérivées à partir des champs Organism et `data_sources`.

---

## 7. Résumé pour le pépiniériste

- **On part de listes** (Hydro-Québec, PFAF, VASCAN, etc.) : chacune apporte des infos sur les plantes (noms, rusticité, usages, etc.).
- **On nettoie les noms** et on **sépare espèces et cultivars** : une fiche par espèce (nom scientifique de base), avec les cultivars rattachés à l’espèce.
- **On fusionne les infos** de plusieurs sources sur la même espèce : rusticité, description, comestibilité, etc., sans tout faire reposer sur une seule source.

**Ce que ça permet** : une base fiable pour gérer les espèces et leurs cultivars (recherche, filtres, fiches riches), avec rusticité, usages et classification, tout en gardant trace de l’origine des données.

---

## 8. Référence des champs espèces (tables BIOT)

Cette section liste l’ensemble des champs disponibles pour les espèces dans le système, puis les compare à une structure type « fiche plante » en 3 onglets (Description, Culture, Utilisation), inspirée de projets locaux similaires.

### 8.1 Table principale : Organism

| Groupe | Champ | Type / remarque |
|--------|--------|------------------|
| **Identification** | `nom_commun` | Nom commun principal |
| | `nom_latin` | Nom scientifique (ex. Malus pumila) |
| | `slug_latin` | Clé unique dérivée du nom latin (fusion imports) |
| | `tsn` | Taxonomic Serial Number (ITIS/USDA) |
| | `vascan_id` | Identifiant VASCAN (Canadensys) |
| | `famille` | Famille botanique |
| | `genus` | Genre botanique (ex. Vaccinium, Amelanchier) |
| **Règne / type** | `regne` | plante / champignon / mousse |
| | `type_organisme` | arbre_fruitier, arbuste, vivace, legume, etc. |
| **Besoins culturaux** | `besoin_eau` | très_faible → très_élevé |
| | `besoin_soleil` | ombre_complète → plein_soleil |
| | `zone_rusticite` | JSON : liste {zone, source} |
| **Sol** | `sol_textures` | JSON : argileux, limoneux, sablonneux, etc. |
| | `sol_ph` | JSON : très_acide → alcalin |
| | `sol_drainage` | très_drainé → demarais (détrempé/marécageux) |
| | `sol_richesse` | pauvre / moyen / riche |
| **Physique** | `hauteur_max` | mètres |
| | `largeur_max` | mètres |
| | `vitesse_croissance` | très_lente → très_rapide |
| **Comestibilité** | `comestible` | booléen |
| | `parties_comestibles` | texte (fruits, feuilles, racines, etc.) |
| | `toxicite` | texte (parties toxiques, précautions) |
| **Fruitiers / noix** | `type_noix` | noyer, noisettier, châtaignier, etc. |
| | `age_fructification` | années avant première fructification |
| | `periode_recolte` | ex. Juillet–Septembre |
| | `pollinisation` | texte (auto-fertile, pollinisateur, etc.) |
| | `distance_pollinisation_max` | mètres |
| | `production_annuelle` | ex. 50–100 kg/an |
| **Écologie** | `fixateur_azote` | booléen |
| | `accumulateur_dynamique` | booléen |
| | `mellifere` | booléen |
| | `produit_juglone` | booléen |
| | `indigene` | booléen |
| **Descriptifs** | `description` | description générale |
| | `notes` | notes personnelles |
| | `usages_autres` | usages non comestibles (médicinal, artisanat, etc.) |
| **Externes** | `data_sources` | JSON : blocs bruts par source (hydroquebec, pfaf, etc.) |
| **Recherche** | `search_vector` | SearchVectorField (PostgreSQL), pondéré A/B/C ; mis à jour par signal et `rebuild_search_vectors` |
| **Médias** | `photo_principale` | FK species.Photo (image par défaut) |
| **Tags** | `mes_tags` | M2M UserTag (via OrganismUserTag) |
| **Métadonnées** | `enrichment_score_pct` | Note d'enrichissement 0–100 % (optionnel) |
| | `date_ajout`, `date_modification` | auto |

### 8.2 Tables liées aux espèces

| Table | Champs principaux | Rôle |
|-------|-------------------|------|
| **OrganismPropriete** | `type_sol` (JSON liste), `ph_min`, `ph_max`, `tolerance_ombre`, `source` | Sol / exposition par source (1–N par organisme) |
| **OrganismUsage** | `type_usage`, `parties`, `description`, `source` | Usages : comestible (fruit, feuille, racine…), médicinal, bois, artisanat, ornement |
| **OrganismCalendrier** | `type_periode`, `mois_debut`, `mois_fin`, `source` | Floraison, fructification, récolte, semis, taille |
| **OrganismNom** | `organism` (FK), `nom`, `langue` (fr/en/autre), `source`, `principal` | Noms alternatifs multilingues par source |
| **Cultivar** | `organism` (FK), `slug_cultivar`, `nom`, `description`, `couleur_fruit`, `gout`, `resistance_maladies`, `notes` | Variété / cultivar rattaché à l’espèce |
| **CultivarPorteGreffe** | `cultivar` (FK), `nom_porte_greffe`, `vigueur`, `hauteur_max_m`, `notes`, `source`, `disponible_chez` (JSON liste) | Porte-greffe associé à un cultivar (disponibilité par source) |
| **CultivarPollinator** | `cultivar`, `companion_cultivar`, `companion_organism`, `notes`, `source` | Compagnon pollinisation (cultivar ou espèce) |
| **CompanionRelation** | `organisme_source`, `organisme_cible`, `type_relation`, `force`, `distance_optimale`, `description`, `source_info` | Compagnonnage / allélopathie entre espèces |
| **Photo** | `organisme` / `specimen` / `event`, `type_photo`, `titre`, `description`, `image`, `date_prise`, `source_url` / `source_author` / `source_license` | Galerie espèce ou spécimen (tronc, feuillage, fleurs, fruits, etc.) |

### 8.3 Correspondance BIOT ↔ fiche type (par onglet)

Une fiche type (projet local similaire / inspirant) structure ses données en **3 onglets** : **Description**, **Culture**, **Utilisation**.

| Onglet (fiche type) | Équivalent / champ BIOT |
|----------------|-------------------------|
| **Description** | |
| Nom, famille, type | `nom_commun`, `nom_latin`, `famille`, `type_organisme` |
| Description générale | `description` (Organism) |
| Port, silhouette | Pas de champ dédié ; peut être dans `description` |
| Feuilles | Pas de champ structuré ; parfois dans `data_sources` (ex. Hydro) ou `description` |
| Fleurs | Idem |
| Fruits | Idem ; pour fruitiers : `parties_comestibles`, `periode_recolte`, `production_annuelle` |
| **Culture** | |
| Sol | `sol_textures`, `sol_ph`, `sol_drainage`, `sol_richesse` + OrganismPropriete |
| Exposition / lumière | `besoin_soleil` + OrganismPropriete.`tolerance_ombre` |
| Eau | `besoin_eau` |
| Zones de rusticité | `zone_rusticite` |
| Dimensions | `hauteur_max`, `largeur_max`, `vitesse_croissance` |
| Multiplication | Pas de champ dédié |
| Entretien | Pas de champ dédié |
| **Utilisation** | |
| Comestible | `comestible`, `parties_comestibles`, `toxicite` + OrganismUsage (type comestible_*) |
| Médicinal | `usages_autres` + OrganismUsage (type medicinal) |
| Ornement / artisanat | OrganismUsage (ornement, artisanat, bois_œuvre) |
| Précautions | `toxicite` (partiellement) ; pas de champ « précautions » dédié |

### 8.4 Champs manquants dans BIOT par rapport à une fiche type

Les éléments suivants existent sur une **fiche type** (projet local similaire / inspirant) ou dans une fiche plante « Description / Culture / Utilisation » mais sont **absents ou non couverts de façon dédiée** dans la base BIOT. Ils peuvent constituer des pistes d’enrichissement ou de futurs champs.

| Manquant dans BIOT | Présent sur fiche type | Remarque |
|--------------------|---------------------|----------|
| **Description structurée : feuilles** | Onglet Description (forme, couleur, disposition) | En BIOT : au mieux dans `description` ou dans `data_sources` (ex. Hydro) en texte libre. |
| **Description structurée : fleurs** | Onglet Description (couleur, période, forme) | Idem ; période partiellement couverte par OrganismCalendrier (floraison). |
| **Description structurée : fruits** | Onglet Description (aspect, maturation) | En BIOT : `parties_comestibles`, `periode_recolte` ; pas de champ dédié « aspect fruit ». |
| **Port / silhouette** | Onglet Description | Pas de champ dédié ; possible dans `description`. |
| **Multiplication** | Onglet Culture (bouture, semis, division, greffe) | Pas de champ ou table dédiée en BIOT. |
| **Entretien** | Onglet Culture (taille, soins) | Pas de champ dédié ; « taille » partiellement dans OrganismCalendrier.`type_periode` = taille. |
| **Précautions dédiées** | Onglet Utilisation (toxicité, contre-indications) | En BIOT : `toxicite` couvre une partie ; pas de champ « précautions » ou « contre-indications » séparé. |

**Résumé visuel (écarts principaux)** :

```
Fiche type (3 onglets)       BIOT
────────────────────────────────────────────────────────────
Description                 → description, type_organisme, famille
  • Port                    → (dans description ou vide)
  • Feuilles (structuré)     → (texte libre ou data_sources)
  • Fleurs (structuré)       → (texte libre ou data_sources)
  • Fruits (structuré)       → (texte libre + calendrier récolte)
Culture
  • Sol / exposition / eau   → sol_*, besoin_*, OrganismPropriete
  • Rusticité                → zone_rusticite
  • Dimensions               → hauteur_max, largeur_max
  • Multiplication           → [MANQUANT]
  • Entretien                → [MANQUANT – sauf calendrier « taille »]
Utilisation
  • Comestible / médicinal   → comestible, usages_autres, OrganismUsage
  • Précautions dédiées      → [PARTIEL – toxicite seulement]
```

---

## 9. Pistes d’évolution

Ces pistes ne font pas partie de l’implémentation actuelle ; elles prolongent l’objectif d’une base espèces « riche » (fiche plante complète, voir §8.4).

- **Objectif qualité** : viser des fiches complètes (zones, sol, usages, calendrier, compagnonnage) pour permettre rappels et événements attendus côté app (ex. « Floraison attendue : mai–juin » pour un pommier).
- **Événements attendus et rappels suggérés** : à partir de `OrganismCalendrier` (floraison, récolte, semis, taille) et des spécimens du jardin (ou favoris), l’app pourrait afficher « Ce mois-ci : floraison attendue (Pommier, Lilas…), récolte attendue (Pomme, Poire…) » et proposer de créer un rappel ou un événement type floraison/récolte avec une date par défaut dérivée des mois du calendrier. Aucun changement obligatoire des modèles `Event` ou `Reminder` : couche dérivée « expected events » (API ou vue).
- **Maladies et ravageurs** : source potentielle Espace pour la vie / MAPAQ ; stockage dans `data_sources` ou table dédiée, à définir.
- **Autres champs manquants** (voir §8.4) : description structurée feuilles/fleurs/fruits, port/silhouette, multiplication, entretien, précautions dédiées — à traiter selon les besoins et la disponibilité des données.
