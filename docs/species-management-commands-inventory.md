# Inventaire — `species/management/commands/` (Jardin bIOT)

Référence pour la **phase 3** (nettoyage) : ce qui est encore dans le dépôt BIOT **n’implique pas** que ces commandes soient exposées dans l’admin ou l’API mobile.

## Flux officiel catalogue botanique (Pass C)

| Commande | Rôle |
|----------|------|
| **`sync_radixsylva`** | Synchronise le cache depuis l’API Radix (`RADIX_SYLVA_API_URL`). **Exposée** gestion des données + API `run-command`. |
| **`rebuild_search_vectors`** | Recalcule `search_vector` PostgreSQL. **Exposée**. |
| **`wipe_db_and_media`** | Destructif. **Exposée** (avec `no_input` forcé côté API). |

## Imports botaniques (fichiers encore présents — usage typique CLI / scripts / maintenance)

Non exposés sur la page « Gestion des données » (Pass C). Les **imports de masse** côté prod sont attendus sur **Radix Sylva**.

> **Double dépôt** — Les fichiers `import_*.py` listés ci‑dessous existent encore sous `species/management/commands/` dans BIOT pour alignement historique ou scripts ponctuels ; le **flux officiel** et la doc à jour des commandes sont le dépôt **Radix** (`radixsylva/botanique/management/commands/`). Ne pas traiter les deux arborescences comme des sources de vérité indépendantes : privilégier Radix puis `sync_radixsylva`. Voir [`radixsylva/docs/gestion-des-donnees.md`](../../radixsylva/docs/gestion-des-donnees.md).

| Fichier | Thème |
|---------|--------|
| `import_hydroquebec.py` | Hydro-Québec |
| `import_vascan.py` | VASCAN |
| `import_usda.py`, `import_usda_chars.py` | USDA / ITIS |
| `import_pfaf.py` | PFAF |
| `import_botanipedia.py` | Botanipedia |
| `import_arbres_en_ligne.py`, `import_arbres_montreal.py`, `import_arbres_quebec.py` | Arbres (sources régionales) |
| `import_ancestrale.py` | Pépinière ancestrale |
| `import_topic.py` | TOPIC Canada |
| `import_wikidata.py`, `import_wikimedia_photos.py` | Wikidata / photos |
| `merge_organism_duplicates.py` | Fusion doublons |
| `populate_*`, `update_enrichment_scores.py`, `clean_organisms_keep_hq.py` | Maintenance / enrichissement |
| `wipe_species.py` | Vidage tables espèces (attention) |

## Autres commandes BIOT (hors « encyclopédie » Radix)

| Fichier | Rôle |
|---------|------|
| `import_seeds.py` | Semences / catalogues fournisseurs (reste pertinent côté BIOT). |
| `migrate_cultivar_organisms.py` | Migration données cultivars / spécimens (à utiliser avec discernement). |
| `set_garden_boundary.py` | Jardins / géométrie. |
| `fetch_weather.py` | Météo. |

## Suite possible (dette technique)

- Extraire les **helpers** réutilisés depuis des commandes vers des modules (`species/utils.py` ou équivalent) si des imports croisés posent problème — voir `docs/radix-biot-pass-c.md` § Suite possible.
