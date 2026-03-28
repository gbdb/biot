# Contexte technique bIOT

## Production (mars 2026)

- **URL publique** : **`https://jardinbiot.ca`** (DigitalOcean, droplet `137.184.169.255`, code sous `/srv/jardinbiot/`).
- **Déploiement** : push sur **`main`** → GitHub Actions (secrets `DROPLET_IP`, `SSH_PRIVATE_KEY`) — détail **`docs/deploy-production-digitalocean-github.md`**.
- **Fichiers statiques** : `STATIC_ROOT = BASE_DIR / 'staticfiles'` dans `jardinbiot/settings.py` ; `collectstatic` en CI/CD. Ne pas éditer `settings.py` à la main sur le serveur.

## Radix Sylva ↔ catalogue espèces (BIOT)

- **Radix Sylva** (dépôt séparé) : source de vérité botanique, API **`https://radix.jardinbiot.ca/api/v1`** en prod.
- **Jardin bIOT** : copie locale des tables `species_*` + jardins / spécimens / semences ; mise à jour botanique via **`python manage.py sync_radixsylva`** et `RADIX_SYLVA_API_URL` dans `.env`. Les imports de masse ne se font **pas** sur BIOT — voir **`docs/radix-biot-pass-c.md`**. Documentation canonique du modèle et des imports : dépôt Radix, **`docs/donnees-sources-et-modele.md`** et **`docs/gestion-des-donnees.md`** (chemins relatifs depuis `radixsylva/docs/`).

## Base de données
- **PostgreSQL obligatoire** : `DATABASE_URL` requis dans `.env` (plus de SQLite pour Django). (`jardinbiot/settings.py`)
- **Connexion via `DATABASE_URL` dans `.env`** via `django-environ` (`jardinbiot/settings.py` lit `.env` et applique `env.db()`).
- **Extensions** : **pas de GeoDjango** (pas de `django.contrib.gis` dans `INSTALLED_APPS`) et pas de GDAL dans les deps. Les calculs geographiques passent par `shapely` + `pyproj`. (`jardinbiot/settings.py`, `requirements.txt`, `gardens/models.py`)
- **Geometries stockees en `JSONField`** (GeoJSON) : `Garden.boundary/contours_geojson/terrain_stats` et `Zone.boundary` sont des `models.JSONField`. Les **surfaces** sont calculees via `shapely` + `pyproj` dans `Zone.save()`. (`gardens/models.py`)

## Stack
- **Backend : Django + DRF** (`rest_framework` dans `INSTALLED_APPS`, et endpoints via `jardinbiot/urls.py`).
- **Auth : JWT** via `djangorestframework-simplejwt` (`rest_framework_simplejwt`, `JWTAuthentication`, endpoints `TokenObtainPairView`/`TokenRefreshView`/`TokenVerifyView`). (`requirements.txt`, `jardinbiot/settings.py`, `jardinbiot/urls.py`)
- **Mobile : React Native / Expo** : configuration Expo dans `mobile/app.json` (expo-router, plugins, etc.). (`mobile/app.json`)
- **Web 3D : Cesium.js** : assets Cesium cote web (Cesium Ion / view) et scripts dans `species/static/cesium/`. (`docs/cesium-ion-vue-3d.md`, `species/static/cesium/terrain_cesium.js`)

## Conventions importantes (verifiees et/ou corrigees)
- **Import especes : "enrich-only" depend de la commande**
  - Certaines commandes sont explicitement **en mode enrich-only strict** (ex. `import_usda_chars` utilise `find_or_match_organism(..., create_missing=False)` et documente "Mode enrich-only strict"). (`species/management/commands/import_usda_chars.py`)
  - La logique de matching `find_or_match_organism()` a un parametre `create_missing` qui vaut **`True` par defaut** : donc la creation d'`Organism` est possible si la commande ne force pas `create_missing=False`. (Référence code : `radixsylva/botanique/source_rules.py` ; miroir aligné sous `species/source_rules.py` dans BIOT.)
- **`get_or_create` n'est pas absent** :
  - `find_organism_and_cultivar` utilise `Cultivar.objects.get_or_create(...)` (cas cultivar dans le nom latin). (`radixsylva/botanique/source_rules.py` / `species/source_rules.py`)
- **Backup : `pg_dump` (pas `sqlite3`) pour le backup "base especes"**
  - La page `gestion_donnees_view` declare un backup base especes avec `pg_dump` (et impose `postgresql`), et une restauration avec `psql`. (`species/views.py`)
- **Geographie : WGS84 + EPSG:32198 pour les calculs de surfaces**
  - `Zone.boundary` est documentee en GeoJSON **WGS84**, et `Zone.save()` projette de `EPSG:4326` vers `EPSG:32198` pour calculer `surface_m2`. (`gardens/models.py`)

## Fichiers cles
- **Pipeline import / matching & regles multi-sources** : `radixsylva/botanique/source_rules.py` (matching fuzzy/normalisation, fusion, parametre `create_missing`, priorite par champ) ; copie BIOT `species/source_rules.py`.
- **Enrichissement** : `species/enrichment.py` (`enrich_organism(...)` + sources externes via VASCAN/USDA/Botanipedia). (`species/enrichment.py`)
- **Admin donnees** : `/admin/gestion-donnees/` (vue Django `gestion_donnees_view`, template `species/templates/species/gestion_donnees.html`). (`jardinbiot/urls.py`, `species/views.py`)

