# Import des espèces : purification, spécialisation et enrichissement

Ce document décrit comment le système transforme les données brutes des sources (Hydro-Québec, PFAF, VASCAN, etc.) en une base d’espèces et de cultivars exploitable. Il peut servir de **référence technique** (décisions, onboarding) ou de **support pour expliquer à un pépiniériste** comment la base est construite et enrichie.

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

---

## 2. Purification des données

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

## 3. Spécialisation : espèce, cultivar, famille

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

## 4. Enrichissement multi-sources

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

---

## 5. Étapes d’import en pratique

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

### Autres sources

- **VASCAN, USDA, Villes, arbres Québec/Montréal** : voir [docs/sources-donnees.md](sources-donnees.md) pour les commandes et le détail. Même logique de match (identifiants, nom latin, nom commun) et d’enrichissement.

### Ordre recommandé

1. **Catalogue** : créer ou étendre la base avec une source (Hydro-Québec, PFAF ou VASCAN avec `--file`).
2. **Enrichissement** : lancer les imports en mode enrichissement (VASCAN `--enrich`, USDA `--enrich`) et/ou PFAF avec `--merge fill_gaps`.
3. **Merge doublons** : fusionner les lignes qui correspondent à la même espèce (même nom latin normalisé / nom commun).
4. **Migration cultivars** : si des anciennes données ont des cultivars stockés comme Organism séparés, lancer `migrate_cultivar_organisms` pour les convertir en espèce + Cultivar.
5. **Propriétés / usages / calendrier** : `populate_proprietes_usage_calendrier` pour remplir les tables dérivées à partir des champs Organism et `data_sources`.

---

## 6. Résumé pour le pépiniériste

- **On part de listes** (Hydro-Québec, PFAF, VASCAN, etc.) : chacune apporte des infos sur les plantes (noms, rusticité, usages, etc.).
- **On nettoie les noms** et on **sépare espèces et cultivars** : une fiche par espèce (nom scientifique de base), avec les cultivars rattachés à l’espèce.
- **On fusionne les infos** de plusieurs sources sur la même espèce : rusticité, description, comestibilité, etc., sans tout faire reposer sur une seule source.

**Ce que ça permet** : une base fiable pour gérer les espèces et leurs cultivars (recherche, filtres, fiches riches), avec rusticité, usages et classification, tout en gardant trace de l’origine des données.

---

## 7. Référence des champs espèces (tables BIOT)

Cette section liste l’ensemble des champs disponibles pour les espèces dans le système, puis les compare à la structure des fiches Tisanji (référence : [fiche exemple Tisanji](https://tisanji.com/fiches/achillee_noblessa?plantid=5133), 3 onglets : Description, Culture, Utilisation).

### 7.1 Table principale : Organism

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
| | `sol_drainage` | très_drainé → démarrais |
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
| **Médias** | `photo_principale` | FK Photo (image par défaut) |
| **Tags** | `mes_tags` | M2M UserTag |
| **Métadonnées** | `date_ajout`, `date_modification` | auto |

### 7.2 Tables liées aux espèces

| Table | Champs principaux | Rôle |
|-------|-------------------|------|
| **OrganismPropriete** | `type_sol`, `ph_min`, `ph_max`, `tolerance_ombre`, `source` | Sol / exposition par source (1–N par organisme) |
| **OrganismUsage** | `type_usage`, `parties`, `description`, `source` | Usages : comestible (fruit, feuille, racine…), médicinal, bois, artisanat, ornement |
| **OrganismCalendrier** | `type_periode`, `mois_debut`, `mois_fin`, `source` | Floraison, fructification, récolte, semis, taille |
| **Cultivar** | `nom`, `description`, `couleur_fruit`, `gout`, `resistance_maladies`, `notes` | Variété / cultivar rattaché à l’espèce |
| **CultivarPollinator** | `companion_cultivar`, `companion_organism`, `notes`, `source` | Compagnon pollinisation (cultivar ou espèce) |
| **CompanionRelation** | `organisme_source`, `organisme_cible`, `type_relation`, `force`, `distance_optimale`, `description` | Compagnonnage / allélopathie entre espèces |
| **Photo** | `type_photo`, `titre`, `description`, `image`, `date_prise`, attribution | Galerie espèce (tronc, feuillage, fleurs, fruits, etc.) |

### 7.3 Correspondance Biot ↔ Tisanji (par onglet)

Tisanji structure ses fiches en **3 onglets** : **Description**, **Culture**, **Utilisation**.

| Onglet Tisanji | Équivalent / champ BIOT |
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

### 7.4 Champs manquants dans BIOT par rapport à Tisanji

Les éléments suivants existent sur **Tisanji** (ou dans une fiche plante type « Description / Culture / Utilisation ») mais sont **absents ou non couverts de façon dédiée** dans la base BIOT. Ils peuvent constituer des pistes d’enrichissement ou de futurs champs.

| Manquant dans BIOT | Présent sur Tisanji | Remarque |
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
Tisanji (3 onglets)          BIOT
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
