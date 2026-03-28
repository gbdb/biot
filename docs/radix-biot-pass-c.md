# Radix Sylva ↔ Jardin bIOT — Pass C (état actuel)

## Rôles

| Projet | Rôle |
|--------|------|
| **Radix Sylva** (`radixsylva/`) | Source de vérité botanique : imports (`import_*`), enrichissement, merge doublons, `wipe_species`, etc. |
| **Jardin bIOT** (racine) | Cache lecture des mêmes tables `species_*` + jardins, spécimens, semences, utilisateurs. Mise à jour botanique via **`sync_radixsylva`**. |

**Documentation Radix (imports et modèle)** : [`../../radixsylva/docs/gestion-des-donnees.md`](../../radixsylva/docs/gestion-des-donnees.md) (commandes, enchaînements), [`../../radixsylva/docs/donnees-sources-et-modele.md`](../../radixsylva/docs/donnees-sources-et-modele.md) (structure, sources, cultivars, conflits).

## Environnements Python

Utiliser **deux venv** :

- Racine `biot/` : `python3 -m venv .venv` → `pip install -r requirements.txt` → `manage.py` Jardin bIOT.
- `radixsylva/` : venv dédié → `pip install -r radixsylva/requirements.txt` → `manage.py` Radix.

Ne pas activer le venv Radix pour lancer le `manage.py` à la racine (il manquerait `djangorestframework-simplejwt`, etc.).

## Flux recommandé

1. Sur **Radix** : migrations, imports, commandes de maintenance.
2. Sur **BIOT** : `.env` avec `RADIX_SYLVA_API_URL` (ex. `http://127.0.0.1:8001/api/v1`) et optionnellement `RADIX_SYLVA_SYNC_API_KEY` si les clés sont définies sur Radix.
3. `python manage.py sync_radixsylva --full` (première fois), puis `sync_radixsylva` sans `--full` pour les deltas.  
   Implémentation : `species/management/commands/sync_radixsylva.py` (consomme `RADIX_SYLVA_API_URL` + `/api/v1/sync/*`).

Filigrane stocké dans **`catalog.RadixSyncState`**.

## Pass C — changements BIOT (interface)

- **Gestion des données** (`/admin/gestion-donnees/`) : les commandes exposées sont **`sync_radixsylva`**, **`rebuild_search_vectors`**, **`wipe_db_and_media`** uniquement.
- **API** `POST /api/admin/run-command/` : même liste.
- **API** `POST /api/admin/import-vascan-file/` : **410 Gone** — utiliser Radix + sync.
- Upload VASCAN sur la page web : **désactivé** (message d’avertissement).
- Les blocs **Hydro-Québec** (téléchargement / import JSON local) restent pour transition ; le flux cible est Radix + sync.

Les fichiers **`species/management/commands/import_*.py`** existent encore (enrichissement admin ponctuel, scripts, tests) ; ils ne sont plus lancés depuis la gestion des données ni depuis l’API admin ci-dessus.

## Pass C bis (fait ou partiel)

- **PostgreSQL en dev** : `docker compose` à la racine du repo BIOT + `DATABASE_URL` — voir **`docs/dev-postgres-etapes-3-4.md`**.
- **Importer PFAF (admin Django)** : page remplacée par un message (Radix + `sync_radixsylva`).
- **Mobile (Paramètres → Avancé)** : `sync_radixsylva`, `rebuild_search_vectors`, `wipe_db_and_media` uniquement.

## Plan global (phases)

- **[plan-radix-biot-phases.md](plan-radix-biot-phases.md)** — ordre recommandé, dont **phase 0** : DigitalOcean (droplet + Postgres Radix en ligne, sous-domaine `*.jardinbiot.ca`) **avant** migration données prod et déploiement API public.
- Détail DO : **[hebergement-radix-digitalocean.md](hebergement-radix-digitalocean.md)**.

## Suite possible

- Retirer ou déplacer les commandes dupliquées du dossier `species/management/commands/` après extraction des helpers (`enrichment.py` importe encore des fonctions depuis certaines commandes).

## Avertissement `RequestsDependencyWarning`

Si `requests` signale une incompatibilité de version avec `urllib3` / `chardet`, c’est cosmétique en général ; en cas de doute, aligner les versions sur `requirements.txt` du projet concerné.
