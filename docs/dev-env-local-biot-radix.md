# Dev local — alignement `.env` BIOT ↔ Radix

Deux **dépôts** distincts, deux **bases PostgreSQL** en local (ports différents), **sans** mélanger les rôles.

---

## Ports et Docker

| Service | Port Postgres (hôte) | Fichier |
|--------|------------------------|---------|
| **Radix Sylva** | `5433` | `radixsylva/docker-compose.yml` |
| **Jardin bIOT** | `5434` | `biot/docker-compose.yml` (racine du repo BIOT) |

---

## Variables essentielles

| Variable | BIOT | Radix |
|----------|------|-------|
| `DATABASE_URL` | Obligatoire → base `jardinbiot` sur **5434** | Obligatoire → base `radixsylva` sur **5433** |
| `SECRET_KEY` | Django BIOT (secret **propre** à ce projet) | Django Radix (secret **propre** — pas le même) |
| `DEBUG` | `True` en dev | `True` en dev |
| Sync / API | `RADIX_SYLVA_API_URL` = URL de l’API Radix (ex. `http://127.0.0.1:8001/api/v1`) | `RADIX_SYLVA_SYNC_API_KEYS` = clés pour les clients qui appellent `/sync/` (optionnel en dev) |

---

## Ordre de démarrage typique

1. `docker compose up -d` dans **`radixsylva/`** puis dans **`biot/`** (à la racine).
2. Copier **`.env.example` → `.env`** dans chaque repo et ajuster si besoin.
3. Radix : `python manage.py runserver 0.0.0.0:8001`
4. BIOT : `python manage.py runserver 0.0.0.0:8000`
5. Depuis BIOT : `python manage.py sync_radixsylva` quand tu veux mettre à jour le cache espèces.

---

## Fichiers modèles

- `biot/.env.example`
- `radixsylva/.env.example`

Plus de détail sur les secrets et la prod : `radixsylva/docs/env-et-deploiement.md`.
