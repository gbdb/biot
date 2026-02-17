# Guide de mapping pour fournisseurs de semences

Ce document permet aux semenciers de préparer leur catalogue pour l'import dans Jardin bIOT. Le système accepte des colonnes avec des noms variés grâce à un mapping flexible.

## Formats supportés

- **CSV** : délimiteur virgule `,`, point-virgule `;` ou tabulation
- **JSON** : liste d'objets avec clés en snake_case ou format original
- Encodage recommandé : **UTF-8**

## Colonnes reconnues automatiquement

Le système teste plusieurs alias pour chaque champ. Si votre colonne correspond à l'un de ces noms (insensible à la casse, espaces et tirets normalisés), elle sera reconnue.

### Identification de l'espèce (obligatoire)

| Champ bIOT | Alias reconnus (exemples) |
|------------|---------------------------|
| `nom_latin` | latin_name, nom_latin, latin, scientific_name, species, binomial |
| `nom_commun` | common_name, nom_commun, commonname, name, plant_name, variety |

Au moins **un** des deux (nom_latin ou nom_commun) doit être présent.

### Variété et lot

| Champ bIOT | Alias reconnus |
|------------|----------------|
| `variete` | variete, variety, cultivar, cultivar_name |
| `lot_reference` | lot_reference, lot_number, lot, batch, numero_lot |

### Quantité et unité

| Champ bIOT | Alias reconnus | Unité |
|------------|----------------|-------|
| `quantite` | quantite, quantity, count, seeds_count |
| `unite` | unite, unit, uom | graines, g, ml, sachet |

### Viabilité / Durée de vie

| Champ bIOT | Alias reconnus | Format |
|------------|----------------|--------|
| `date_recolte` | date_recolte, harvest_date, test_date, year |
| `duree_vie_annees` | duree_vie_annees, viability_years, seed_life, shelf_life |
| `germination_lab_pct` | germination, germination_pct, germination_rate | 0-100 |

### Stratification

| Champ bIOT | Alias reconnus |
|------------|----------------|
| `stratification_requise` | stratification, stratification_required, cold_stratification |
| `stratification_duree_jours` | stratification_days, cold_strat_days, strat_days |
| `stratification_temp` | stratification_type, cold_warm | froide, chaude, chaude_puis_froide |
| `stratification_notes` | stratification_notes |

### Germination

| Champ bIOT | Alias reconnus |
|------------|----------------|
| `temps_germination_jours_min` | germination_days_min, days_to_germinate_min |
| `temps_germination_jours_max` | germination_days, days_to_germinate, germ_days |
| `temperature_optimal_min` | temp_min, germ_temp_min, soil_temp_min |
| `temperature_optimal_max` | temp_max, germ_temp_max, soil_temp_max |

### Pré-traitement

| Champ bIOT | Alias reconnus |
|------------|----------------|
| `pretraitement` | pretreatment, scarification, trempage, soak |

## Exemple CSV minimal

```csv
latin_name,common_name,variety,germination_days,stratification_days
Solanum lycopersicum,Tomate,Roma VF,7-14,
Malus domestica,Pommier,Dolgo,30-90,90
```

## Exemple CSV complet

```csv
latin_name,common_name,variety,lot_number,quantity,unit,test_date,viability_years,germination_pct,stratification_required,stratification_days,stratification_type,germination_days_min,germination_days_max,soil_temp_min,soil_temp_max,pretreatment
Solanum lycopersicum,Tomate,Roma VF,LOT-2025-001,50,graines,2025-01-15,4,95,,,7,14,18,24,
Malus domestica,Pommier,Dolgo,LOT-2024-042,20,graines,2024-10-01,2,88,oui,90,froide,30,90,4,5,
```

## Mapping personnalisé (avancé)

Si vos colonnes ont des noms non reconnus, vous pouvez créer un fournisseur dans l'admin avec une configuration de mapping JSON :

```json
{
  "column_mapping": {
    "Latin Name": "nom_latin",
    "Common Name": "nom_commun",
    "Cultivar": "variete",
    "Cold Strat (days)": "stratification_duree_jours",
    "Germ Days": "temps_germination_jours_max"
  }
}
```

## Commande d'import

```bash
# Import basique
python manage.py import_seeds --file=catalogue.csv

# Avec fournisseur (ID du SeedSupplier)
python manage.py import_seeds --file=catalogue.csv --supplier=1

# Limiter le nombre de lignes (test)
python manage.py import_seeds --file=catalogue.csv --limit=10

# Mettre à jour les lots existants
python manage.py import_seeds --file=catalogue.csv --update-existing

# Mode dry-run (affiche sans écrire)
python manage.py import_seeds --file=catalogue.csv --dry-run
```

## Vérifier vos colonnes avant import

Avant d'importer, lancez la commande avec `--limit=1` et `--dry-run` pour voir quelles colonnes sont détectées :

```bash
python manage.py import_seeds --file=votre_catalogue.csv --limit=1 --dry-run
```

La sortie affichera les colonnes disponibles et les valeurs trouvées sur la première ligne.

## Correspondance des valeurs

### Stratification requise (booléen)

Reconnu comme *oui* : `y`, `yes`, `oui`, `o`, `1`, `true`, `required`, `x`

### Unité

- `graines`, `grains`, `seeds` → graines
- `g`, `grammes`, `grams` → g
- `ml`, `millilitres` → ml
- `sachet`, `packet` → sachet

### Type de stratification

- `froide`, `cold`, `froid` → froide
- `chaude`, `warm`, `hot` → chaude
- `chaude puis froide` → chaude_puis_froide

### Date

Formats acceptés : `YYYY-MM-DD`, `DD/MM/YYYY`, `YYYY` (année seule)
