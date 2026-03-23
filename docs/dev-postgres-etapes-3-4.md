# Dev Jardin bIOT — PostgreSQL unique + étapes 3 et 4

## 1. PostgreSQL pour le dev (configuration recommandée)

Objectif : **`search_vector`** et le même moteur qu’en prod, une seule façon de lancer BIOT en local.

### Avec Docker

À la **racine du dépôt** `biot/` :

```bash
docker compose up -d
```

Dans **`.env`** (à la racine) :

```env
DATABASE_URL=postgres://jardinbiot:jardinbiot@127.0.0.1:5434/jardinbiot
```

Puis (venv **racine** `biot/.venv`) :

```bash
pip install -r requirements.txt   # installe psycopg (v3)
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

- **Port 5434** : évite le conflit avec **Radix** (`radixsylva/docker-compose.yml` utilise souvent **5433**).
- **`DATABASE_URL` obligatoire** : sans lui, Django refuse de démarrer (PostgreSQL uniquement).

### Sans Docker

Créer une base PostgreSQL locale et renseigner `DATABASE_URL` au même format.

---

## 2. Étape 2 (rappel) — Données botaniques

- **Radix** : imports (`import_hydroquebec`, etc.) + API. En **local** : souvent `http://127.0.0.1:8001/api/v1`. En **production** : **`https://radix.jardinbiot.ca/api/v1`**.
- **BIOT** : dans `.env`, **`RADIX_SYLVA_API_URL`** aligné sur l’API que tu cibles (HTTPS en prod). Puis `python manage.py sync_radixsylva --full` puis syncs incrémentaux.

---

## 3. Étape 3 (Pass C) — état actuel

| Fait | Détail |
|------|--------|
| Gestion des données / API admin | Commandes : `sync_radixsylva`, `rebuild_search_vectors`, `wipe_db_and_media` |
| Import VASCAN (web + API) | Désactivé → Radix + sync |
| Import PFAF (admin Django) | Page remplacée par un message + lien vers sync |
| Mobile (Paramètres → Avancé) | Boutons alignés sur les mêmes commandes (plus d’import bulk depuis l’app) |

**Hors scope pour l’instant** (autre plan) : refonte du score d’**enrichissement** et des flux d’enrichissement automatique.

**Suite optionnelle** : retirer physiquement les `species/management/commands/import_*.py` dupliqués après extraction des helpers pour `enrichment.py`.

---

## 4. Étape 4 — validation rapide (checklist)

- [ ] Radix `:8001` + BIOT `:8000` avec **Postgres** BIOT (`DATABASE_URL`).
- [ ] `curl -s http://127.0.0.1:8000/api/v1/species/` (ou liste espèces utilisée par l’app) cohérente après sync.
- [ ] `python manage.py rebuild_search_vectors` sur BIOT **ne dit plus** « Ignoré » (PostgreSQL actif).
- [ ] App mobile : connexion, liste jardins / espèces ; **hors-ligne** : comportement acceptable (cache local / messages d’erreur clairs) — à affiner selon ta stratégie offline.
- [ ] Déploiement prod : deux services (Radix + BIOT), secrets, `RADIX_SYLVA_API_URL` / clés sync.

---

## 5. Deux venv Python

Rien ne change : **`.venv` à la racine** pour BIOT, **`radixsylva/.venv`** pour Radix.
